import { AudibleProduct } from '#config/typing/audible'
import { Book } from '#config/typing/books'
import ApiHelper from '#helpers/books/audible/ApiHelper'
import StitchHelper from '#helpers/books/audible/StitchHelper'
import {
	apiResponse,
	genresObject,
	htmlResponse,
	parsedBook,
	parsedBookWithGenres
} from '#tests/datasets/helpers/books'

let asin: string
let helper: StitchHelper

beforeEach(() => {
	asin = 'B079LRSMNN'
	// Set up helpers
	helper = new StitchHelper(asin)
})

describe('StitchHelper should', () => {
	beforeEach(() => {
		jest.spyOn(helper.apiHelper, 'fetchBook').mockImplementation(() => Promise.resolve(apiResponse))
		jest
			.spyOn(global, 'fetch')
			.mockImplementationOnce(() =>
				Promise.resolve({ ok: true, status: 200, text: () => htmlResponse } as unknown as Response)
			)
	})

	test('setup constructor correctly', () => {
		expect(helper.asin).toBe(asin)
		expect(helper.apiHelper).toBeInstanceOf(ApiHelper)
	})

	test('fetch API source', async () => {
		await helper.fetchApiBook()
		expect(helper.apiResponse).toEqual(apiResponse)
	})

	test('parse API source', async () => {
		await helper.fetchApiBook()
		await helper.parseApiResponse()
		expect(helper.apiParsed).toEqual(parsedBook)
	})

	test('parse HTML source', async () => {
		await helper.fetchScraperBook()
		await helper.parseScraperResponse()
		expect(helper.scraperParsed).toEqual(genresObject)
	})

	test('process book', async () => {
		const proccessed = await helper.process()

		expect(proccessed).toEqual(parsedBookWithGenres)
		expect(helper.apiResponse).toEqual(apiResponse)
		expect(helper.apiParsed).toEqual(parsedBook)
	})
})

describe('SitchHelper should handle fallback', () => {
	test('and includeGenres properly', async () => {
		const obj = { data: apiResponse }
		obj.data.product.category_ladders = []
		jest.spyOn(helper.apiHelper, 'fetchBook').mockImplementation(() => Promise.resolve(obj.data))
		jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				text: () => htmlResponse
			} as unknown as Response)
		)
		await helper.process()
		expect(helper.scraperParsed).toEqual(genresObject)
	})

	test('and include no genres', async () => {
		const obj = { data: apiResponse }
		obj.data.product.category_ladders = []
		jest.spyOn(helper.apiHelper, 'fetchBook').mockImplementation(() => Promise.resolve(obj.data))
		jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
			Promise.resolve({
				ok: true,
				status: 200
			} as unknown as Response)
		)
		parsedBook.genres = []
		const processed = await helper.process()
		expect(processed).toEqual(parsedBook)
		expect(helper.scraperParsed).toBeUndefined()
	})
})

describe('StitchHelper should throw error when', () => {
	beforeEach(() => {
		// Mock Fetch to fail
		jest.spyOn(global, 'fetch').mockImplementation(() => Promise.reject({ status: 400, ok: false }))
	})

	test('fetching api book data fails completely', async () => {
		await expect(helper.fetchApiBook()).rejects.toThrowError(
			`Error occured while fetching data from API: Error: An error has occured while fetching from Audible API. Response: 400, ASIN: ${asin}`
		)
	})

	test('fetching scraper book data fails completely', async () => {
		await expect(helper.fetchScraperBook()).resolves.toBeUndefined()
	})

	test('fetching scraper book data throws an error', async () => {
		jest
			.spyOn(helper.scrapeHelper, 'fetchBook')
			.mockRejectedValueOnce(new Error('An error occured while fetching data from scraper'))
		await expect(helper.fetchScraperBook()).rejects.toThrowError(
			`Error occured while fetching data from scraper: Error: An error occured while fetching data from scraper`
		)
	})

	test('parsing api book data fails', async () => {
		await expect(helper.parseApiResponse()).rejects.toThrowError(
			'Error occured while parsing data from API: Error: No API response to parse'
		)
	})

	test('parsing scraper book data fails', async () => {
		await expect(helper.parseScraperResponse()).resolves.toBeUndefined()
	})

	test('parsing scraper book throws an error', async () => {
		jest
			.spyOn(helper.scrapeHelper, 'parseResponse')
			.mockRejectedValueOnce(new Error('An error occured while parsing data from scraper'))
		await expect(helper.parseScraperResponse()).rejects.toThrowError(
			'Error occured while parsing data from scraper: Error: An error occured while parsing data from scraper'
		)
	})

	test('processing book fails', async () => {
		jest.spyOn(helper, 'fetchApiBook').mockImplementation()
		helper.apiHelper.inputJson = { asin: 'B07JZQZQZQ' } as unknown as AudibleProduct['product']
		await expect(helper.process()).rejects.toThrowError(
			`Required keys not found in API response: ${asin}`
		)
	})

	test('includeGenres returns a non-book type', async () => {
		jest
			.spyOn(helper.sharedHelper, 'sortObjectByKeys')
			.mockImplementation(() => Promise.resolve(genresObject) as unknown as Book)
		helper.scraperParsed = genresObject
		await expect(helper.includeGenres()).rejects.toThrowError(
			`Error occured while sorting book json: ${asin}`
		)
	})
})
