import type { AxiosResponse } from 'axios'
import * as cheerio from 'cheerio'

import { baseAsin10Regex } from '#config/types'
import ScrapeHelper from '#helpers/authors/audible/ScrapeHelper'
import * as fetchPlus from '#helpers/utils/fetchPlus'
import SharedHelper from '#helpers/utils/shared'
import { regions } from '#static/regions'
import { htmlResponseMinified, htmlResponseNameOnly } from '#tests/datasets/audible/authors/scrape'
import { genres, parsedAuthor, similarUnsorted } from '#tests/datasets/helpers/authors'

jest.mock('#helpers/utils/fetchPlus')
jest.mock('#helpers/utils/shared')

let asin: string
let helper: ScrapeHelper
let cheerioHtml: cheerio.CheerioAPI
let mockResponse: string
let region: string
let url: string
const deepCopy = (obj: unknown) => JSON.parse(JSON.stringify(obj))

beforeEach(() => {
	// Variables
	asin = 'B012DQ3BCM'
	mockResponse = deepCopy(htmlResponseMinified)
	cheerioHtml = cheerio.load(mockResponse)
	region = 'us'
	url = `https://www.audible.com/author/${asin}/`
	// Set up spys
	jest.spyOn(SharedHelper.prototype, 'buildUrl').mockReturnValue(url)
	jest.spyOn(SharedHelper.prototype, 'collectGenres').mockReturnValue(genres)
	jest.spyOn(SharedHelper.prototype, 'getAsinFromUrl').mockImplementation((url: string) => {
		return url.match(baseAsin10Regex)?.[0]
	})
	// Set up helpers
	helper = new ScrapeHelper(asin, region)
})

describe('ScrapeHelper should', () => {
	beforeEach(() => {
		jest
			.spyOn(fetchPlus, 'default')
			.mockImplementation(() =>
				Promise.resolve({ data: mockResponse, status: 200 } as AxiosResponse)
			)
	})
	test('setup constructor correctly', () => {
		expect(helper.asin).toBe(asin)
		expect(helper.reqUrl).toBe(url)
	})

	test('fetch author', async () => {
		const author = await helper.fetchAuthor()
		expect(author.html()).toEqual(cheerio.load(mockResponse).html())
	})

	test('parse response', async () => {
		const author = await helper.fetchAuthor()
		await expect(helper.parseResponse(author)).resolves.toEqual(parsedAuthor)
	})

	test('return undefined if no dom for parse response', async () => {
		await expect(helper.parseResponse(undefined)).rejects.toThrow('No response from HTML')
	})

	test('process author', async () => {
		await expect(helper.process()).resolves.toEqual(parsedAuthor)
	})

	test('return description', () => {
		const description = helper.getDescription(cheerioHtml)
		expect(description).toEqual(parsedAuthor.description)
	})

	test('return image', () => {
		const image = helper.getImage(cheerioHtml)
		expect(image).toEqual(parsedAuthor.image)
	})

	test('return name', () => {
		const name = helper.getName(cheerioHtml)
		expect(name).toEqual(parsedAuthor.name)
	})

	test('return similar', () => {
		const similar = helper.getSimilarAuthors(cheerioHtml)
		expect(similar).toEqual(similarUnsorted)
	})

	test('return sorted similar', () => {
		const similar = helper.getSimilarAuthors(cheerioHtml)
		const sorted = helper.sortSimilarAuthors(similar)
		expect(sorted).toEqual(parsedAuthor.similar)
	})

	test('return sorted similar when no similar authors', () => {
		jest.spyOn(helper, 'getSimilarAuthors').mockReturnValue([])
		const similar = helper.getSimilarAuthors(cheerioHtml)
		const sorted = helper.sortSimilarAuthors(similar)
		expect(sorted).toEqual([])
	})

	test('handle no similar authors', () => {
		const similar = helper.getSimilarAuthors(cheerio.load(htmlResponseNameOnly))
		expect(similar).toEqual([])
	})

	test('return a name when author has no bio, genres or image', async () => {
		jest.spyOn(SharedHelper.prototype, 'collectGenres').mockReturnValue([])
		const html = cheerio.load(htmlResponseNameOnly)
		await expect(helper.parseResponse(html)).resolves.toEqual({
			asin: 'B012DQ3BCM',
			description: '',
			genres: [],
			image: '',
			name: 'Jason Anspach',
			region: region,
			similar: []
		})
	})

	describe('handle region: ', () => {
		test.each(Object.keys(regions))('%s', async (region) => {
			helper = new ScrapeHelper('B079LRSMNN', region)
			const data = await helper.process()
			expect(data.region).toEqual(region)
		})
	})
})

describe('ScrapeHelper should throw error when', () => {
	test('no author', async () => {
		asin = asin.slice(0, -1)
		helper = new ScrapeHelper(asin, region)
		jest.restoreAllMocks()
		jest.spyOn(fetchPlus, 'default').mockImplementation(() =>
			Promise.reject({
				status: 404
			})
		)
		await expect(helper.fetchAuthor()).rejects.toThrow(
			`An error occured while fetching data from Audible HTML. Response: 404, ASIN: ${asin}`
		)
	})

	test('parse response fails validation', async () => {
		jest.spyOn(helper, 'getName').mockReturnValue('')
		await expect(helper.parseResponse(cheerio.load(mockResponse))).rejects.toThrowError(
			`Item not available in region '${region}' for ASIN: ${asin}`
		)
	})

	test('getName is header', async () => {
		const html = cheerio.load(mockResponse)
		html('h1').text('Showing titles\n in All Categories')
		await expect(helper.parseResponse(html)).rejects.toThrowError(
			`Item not available in region '${region}' for ASIN: ${asin}`
		)
	})
})
