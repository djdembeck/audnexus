// Import interfaces
import { AuthorInterface } from '../../interfaces/people/index'
import { GenreInterface } from '../../interfaces/audible'
import fetch from 'isomorphic-fetch'
// For HTML scraping
import * as cheerio from 'cheerio'
import SharedHelper from '../shared'
import { htmlToText } from 'html-to-text'

class ScrapeHelper {
    asin: string;
    reqUrl: string;
    constructor (asin: string) {
        this.asin = asin
        const helper = new SharedHelper()
        const baseDomain: string = 'https://www.audible.com'
        const baseUrl: string = 'author'
        this.reqUrl = helper.buildUrl(asin, baseDomain, baseUrl)
    }

    /**
     * Checks the presence of genres on html page and formats them into JSON
     * @param {NodeListOf<Element>} genres selected source from categoriesLabel
     * @returns {GenreInterface[]}
     */
    collectGenres (genres: cheerio.Cheerio<cheerio.Element>[]): GenreInterface[] | undefined {
        // Check and label each genre
        const genreArr: GenreInterface[] | undefined = genres.map((genre, index): any => {
            let thisGenre = {} as GenreInterface
            let asin: string
            let href: string
            const types: Array<string> = ['1st', '2nd', '3rd']
            if (genre.attr('href')) {
                href = genre.attr('href')!
                asin = this.getAsinFromUrl(href)
                if (genre.text() && asin) {
                    thisGenre = {
                        asin: asin,
                        name: genre.children().text(),
                        type: types[index]
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
    async fetchBook (): Promise<cheerio.CheerioAPI | undefined> {
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
    async parseResponse ($: cheerio.CheerioAPI | undefined): Promise<AuthorInterface | undefined> {
        // Base undefined check
        if (!$) {
            return undefined
        }

        const returnJson = {} as AuthorInterface

        // ID
        returnJson.asin = this.asin

        // Bio.
        try {
            returnJson.description = htmlToText(
                $('div.bc-expander-content').children().text(),
                { wordwrap: false }
            )
        } catch (err) {
            console.log(`Bio not available on: ${this.asin}`)
        }

        // Genres.
        try {
            const genres = $('div.contentPositionClass div.bc-box a.bc-color-link')
            .toArray()
            .map(element => $(element))
            returnJson.genres = this.collectGenres(genres)
        } catch (err) {
            console.log(`Genres not available on: ${this.asin}`)
        }

        // Image.
        try {
            // We'll ask for a *slightly* larger than postage-stamp-sized pic...
            returnJson.image = $('img.author-image-outline')[0].attribs.src.replace('__01_SX120_CR0,0,120,120__.', '')
        } catch (err) {
            console.log(`Image not available on: ${this.asin}`)
        }

        // Name.
        try {
            // Workaround data error: https://github.com/cheeriojs/cheerio/issues/1854
            returnJson.name = ($('h1.bc-text-bold')[0].children[0] as any).data
        } catch (err) {
            console.error(err)
        }

        console.log(returnJson)
        return returnJson
    }

    // Helpers
    /**
     * Regex to return just the ASIN from the given URL
     * @param {string} url string to extract ASIN from
     * @returns {string} ASIN.
     */
    getAsinFromUrl (url: string): string {
        const asinRegex = /[0-9A-Z]{9}.+?(?=\?)/gm
        const ASIN = url.match(asinRegex)![0]
        return ASIN
    }

    /**
     * Regex to return just the book position from HTML input
     * @param {JSDOM} html block/object to retrieve book number from.
     * @returns {string} Cleaned book position string, like "Book 3"
     */
    getBookFromHTML (html): string {
        const bookRegex = /(Book ?(\d*\.)?\d+[+-]?[\d]?)/gm
        const matches = html.match(bookRegex)
        return matches
    }
}

export default ScrapeHelper
