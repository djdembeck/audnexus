class StitchHelper {
    apiRes: any;
    htmlRes: any;
    finalJson: any;
    constructor (apiRes, htmlRes) {
        this.apiRes = apiRes
        this.htmlRes = htmlRes
        this.finalJson = apiRes
    }

    includeGenres () {
        if (this.htmlRes.genres) {
            this.finalJson.genres = this.htmlRes.genres
        }
    }

    setSeriesOrder () {
        if (this.apiRes.publication_name) {
            const htmlSeries = this.htmlRes.series
            const returnJson = this.finalJson

            // If multiple series, set one with publication_name as primary
            if (htmlSeries.length > 1) {
                htmlSeries.forEach((item) => {
                    if (item.name === this.apiRes.publication_name) {
                        returnJson.primary_series = item
                    } else {
                        returnJson.secondary_series = item
                    }
                })
            } else {
                returnJson.primary_series = htmlSeries[0]
            }

            delete returnJson.publication_name
        }
    }

    process () {
        this.includeGenres()
        this.setSeriesOrder()
        console.log(this.finalJson)
        return this.finalJson
    }
}

export default StitchHelper
