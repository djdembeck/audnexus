import { FastifyRedis } from '@fastify/redis'

import type { AuthorDocument } from '#config/models/Author'
import { isAuthorProfile } from '#config/typing/checkers'
import { AuthorProfile } from '#config/typing/people'
import { RequestGeneric } from '#config/typing/requests'
import ScrapeHelper from '#helpers/authors/audible/ScrapeHelper'
import PaprAudibleAuthorHelper from '#helpers/database/papr/audible/PaprAudibleAuthorHelper'
import RedisHelper from '#helpers/database/redis/RedisHelper'
import SharedHelper from '#helpers/shared'

export default class AuthorShowHelper {
	asin: string
	authorInternal: AuthorProfile | undefined = undefined
	sharedHelper: SharedHelper
	paprHelper: PaprAudibleAuthorHelper
	redisHelper: RedisHelper
	options: RequestGeneric['Querystring']
	scrapeHelper: ScrapeHelper
	originalAuthor: AuthorDocument | null = null
	constructor(asin: string, options: RequestGeneric['Querystring'], redis: FastifyRedis | null) {
		this.asin = asin
		this.sharedHelper = new SharedHelper()
		this.options = options
		this.paprHelper = new PaprAudibleAuthorHelper(this.asin, this.options)
		this.redisHelper = new RedisHelper(redis, 'book', this.asin)
		this.scrapeHelper = new ScrapeHelper(this.asin)
	}

	async getAuthorFromPapr(): Promise<AuthorDocument | null> {
		return (await this.paprHelper.findOne()).data
	}

	async getAuthorWithProjection(): Promise<AuthorProfile> {
		// 1. Get the author with projections
		const author = await this.paprHelper.findOneWithProjection()
		// Make saure we get a authorprofile type back
		if (!isAuthorProfile(author.data)) throw new Error(`AuthorProfile ${this.asin} not found`)
		return author.data
	}

	async getNewAuthorData() {
		return this.scrapeHelper.process()
	}

	async createOrUpdateAuthor(): Promise<AuthorProfile> {
		// Place the new author data into the papr helper
		this.paprHelper.setAuthorData(await this.getNewAuthorData())

		// Create or update the author
		const authorToReturn = await this.paprHelper.createOrUpdate()
		if (!isAuthorProfile(authorToReturn.data))
			throw new Error(`AuthorProfile ${this.asin} not found`)
		const data = authorToReturn.data

		// Update or create the author in cache
		if (authorToReturn.modified) {
			this.redisHelper.setOne(data)
		}

		// Return the author
		return data
	}

	/**
	 * Check if the author is updated recently by comparing the timestamps of updatedAt
	 */
	isUpdatedRecently() {
		if (!this.originalAuthor) {
			return false
		}
		return this.sharedHelper.checkIfRecentlyUpdated(this.originalAuthor)
	}

	/**
	 * Actions to run when an update is requested
	 */
	async updateActions(): Promise<AuthorProfile> {
		// 1. Check if it is updated recently
		if (this.isUpdatedRecently()) return this.getAuthorWithProjection()

		// 2. Create or update the author
		return this.createOrUpdateAuthor()
	}

	/**
	 * Main handler for the author show route
	 */
	async handler(): Promise<AuthorProfile> {
		this.originalAuthor = await this.getAuthorFromPapr()

		// If the author is already present
		if (this.originalAuthor) {
			// If an update is requested
			if (this.options.update === '1') {
				return this.updateActions()
			}

			// 1. Get the author with projections
			const data = await this.getAuthorWithProjection()

			// 2. Check it it is cached
			const redisAuthor = await this.redisHelper.findOrCreate(data)
			if (redisAuthor && isAuthorProfile(redisAuthor)) return redisAuthor

			// 3. Return the author from DB
			return data
		}

		// If the author is not present
		return await this.createOrUpdateAuthor()
	}
}
