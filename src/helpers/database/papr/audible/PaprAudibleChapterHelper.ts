import ChapterModel from '#config/models/Chapter'
import { ApiChapter } from '#config/typing/books'
import { RequestGeneric } from '#config/typing/requests'
import SharedHelper from '#helpers/shared'

const projectionWithoutDbFields = {
	_id: 0,
	createdAt: 0,
	updatedAt: 0
}

export default class PaprAudibleChapterHelper {
	asin: string
	chapterData!: ApiChapter
	options: RequestGeneric['Querystring']

	constructor(asin: string, options: RequestGeneric['Querystring']) {
		this.asin = asin
		this.options = options
	}

	async create() {
		try {
			await ChapterModel.insertOne(this.chapterData)
			return {
				data: (await this.findOneWithProjection()).data,
				modified: true
			}
		} catch (err) {
			console.error(err)
			throw new Error(`An error occurred while creating chapter ${this.asin} in the DB`)
		}
	}

	async delete() {
		try {
			const deletedChapter = await ChapterModel.deleteOne({ asin: this.asin })
			return {
				data: deletedChapter,
				modified: true
			}
		} catch (err) {
			console.error(err)
			throw new Error(`An error occurred while deleting chapter ${this.asin} in the DB`)
		}
	}

	async findOne() {
		const findOneChapter = await ChapterModel.findOne({
			asin: this.asin
		})
		return {
			data: findOneChapter,
			modified: false
		}
	}

	async findOneWithProjection() {
		const findOneChapter = (await ChapterModel.findOne(
			{
				asin: this.asin
			},
			{ projection: projectionWithoutDbFields }
		)) as unknown as ApiChapter
		return {
			data: findOneChapter,
			modified: false
		}
	}

	setChapterData(chapterData: ApiChapter) {
		this.chapterData = chapterData
	}

	async createOrUpdate() {
		const commonHelpers = new SharedHelper()
		const findInDb = await this.findOneWithProjection()

		// Update
		if (this.options.update === '1' && findInDb.data) {
			// If the objects are the exact same return right away
			const equality = commonHelpers.checkDataEquality(findInDb.data, this.chapterData)
			if (equality) {
				return {
					data: findInDb.data,
					modified: false
				}
			}
			if (this.chapterData.chapters.length) {
				console.log(`Updating chapters for asin ${this.asin}`)
				// Update
				return this.update()
			}
			// No update performed, return original
			return findInDb
		}

		// Create
		return this.create()
	}

	async update() {
		try {
			await ChapterModel.updateOne({ asin: this.asin }, { $set: { ...this.chapterData } })
			// After updating, return with specific projection
			const updatedChapter = await this.findOneWithProjection()
			// Set modified to true to indicate that the data has been updated
			updatedChapter.modified = true
			return updatedChapter
		} catch (err) {
			console.error(err)
			throw new Error(`An error occurred while updating chapter ${this.asin} in the DB`)
		}
	}
}