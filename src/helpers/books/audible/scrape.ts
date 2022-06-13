import SharedHelper from '#helpers/shared'
import { GenreInterface } from '#interfaces/audible'
import { HtmlBookInterface } from '#interfaces/books/index'
import * as cheerio from 'cheerio'
import { htmlToText } from 'html-to-text'
import fetch from 'isomorphic-fetch'

class ScrapeHelper {
    asin: string
    reqUrl: string
    constructor(asin: string) {
        this.asin = asin
        const helper = new SharedHelper()
        const baseDomain: string = 'https://www.audible.com'
        const baseUrl: string = 'pd'
        this.reqUrl = helper.buildUrl(asin, baseDomain, baseUrl)
    }

    /**
     * Checks the presence of genres on html page and formats them into JSON
     * @param {NodeListOf<Element>} genres selected source from categoriesLabel
     * @returns {GenreInterface[]}
     */
    collectGenres(
        genres: cheerio.Cheerio<cheerio.Element>[],
        type: string
    ): GenreInterface[] | undefined {
        // Check and label each genre
        const genreArr: GenreInterface[] | undefined = genres.map((genre, index) => {
            let thisGenre = {} as GenreInterface
            // Only proceed if there's an ID to use
            if (genre.attr('href')) {
                const href = genre.attr('href')!
                const asin = this.getAsinFromUrl(href)
                // Verify existence of name and valid ID
                if (genre.text() && asin) {
                    const cleanedName = htmlToText(genre.text(), { wordwrap: false })
                    thisGenre = {
                        asin: asin,
                        name: cleanedName,
                        type: type
                    }
                }
                return thisGenre
            } else {
                console.log(`Genre ${index} asin not available on: ${this.asin}`)
            }
            return undefined
        }) as GenreInterface[]

        return genreArr
    }

    /**
     * Fetches the html page and checks it's response
     * @returns {Promise<cheerio.CheerioAPI | undefined>} return text from the html page
     */
    async fetchBook(): Promise<cheerio.CheerioAPI | undefined> {
        const response = await fetch(this.reqUrl)
        if (!response.ok) {
            const message = `An error has occured while scraping HTML ${response.status}: ${this.reqUrl}`
            if (response.status !== 404) {
                console.log(message)
            }
            return undefined
        } else {
            const text = await response.text()
            const dom = cheerio.load(text)
            return dom
        }
    }

    /**
     * Parses fetched HTML page to extract genres and series'
     * @param {JSDOM} dom the fetched dom object
     * @returns {HtmlBookInterface} genre and series.
     */
    async parseResponse(
        dom: cheerio.CheerioAPI | undefined
    ): Promise<HtmlBookInterface | undefined> {
        // If there's no dom, don't interrupt the other module cycles
        if (!dom) {
            return undefined
        }

        const genres = dom('li.categoriesLabel a')
            .toArray()
            .map((element) => dom(element))

        const tags = dom('div.bc-chip-group a')
            .toArray()
            .map((element) => dom(element))

        const returnJson = {
            genres: Array<GenreInterface>(genres.length + tags.length)
        } as HtmlBookInterface

        // Combine genres and tags
        if (genres.length) {
            let genreArr = this.collectGenres(genres, 'genre') as any
            // Tags.
            if (tags.length) {
                const tagArr = this.collectGenres(tags, 'tag')
                genreArr = genreArr.concat(tagArr)
            }
            returnJson.genres = genreArr as GenreInterface[]
        }

        return returnJson
    }

    // Helpers
    /**
     * Regex to return just the ASIN from the given URL
     * @param {string} url string to extract ASIN from
     * @returns {string} ASIN.
     */
    getAsinFromUrl(url: string): string {
        const asinRegex = /[0-9A-Z]{9}.+?(?=\?)/gm
        const ASIN = url.match(asinRegex)![0]
        return ASIN
    }
}

export default ScrapeHelper
