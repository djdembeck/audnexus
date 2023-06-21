import { ApiBook, ApiGenre } from '#config/types'
import { B08C6YJ1LS, B017V4IM1G, setupMinimalParsed } from '#tests/datasets/audible/books/api'

let description: string
let genres: ApiGenre[]
let image: string

// Scorcerers Stone
description =
	'Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive. Addressed in green ink on yellowish parchment with a purple seal, they are swiftly confiscated by his grisly aunt and uncle....'
genres = [
	{
		asin: '18572091011',
		name: "Children's Audiobooks",
		type: 'genre'
	},
	{
		asin: '18580606011',
		name: 'Science Fiction & Fantasy',
		type: 'genre'
	},
	{
		asin: '18572323011',
		name: 'Growing Up & Facts of Life',
		type: 'tag'
	},

	{ asin: '18572491011', name: 'Literature & Fiction', type: 'tag' },
	{ asin: '18572505011', name: 'Family Life', type: 'tag' },
	{
		asin: '18572586011',
		name: 'Science Fiction & Fantasy',
		type: 'tag'
	},
	{ asin: '18572587011', name: 'Fantasy & Magic', type: 'tag' },
	{ asin: '18580607011', name: 'Fantasy', type: 'tag' }
]
image = 'https://m.media-amazon.com/images/I/91eopoUCjLL.jpg'
export const combinedB017V4IM1G: ApiBook = setupMinimalParsed(
	B017V4IM1G.product,
	description,
	image,
	genres
)
// The Coldest Case
description =
	"James Patterson's Detective Billy Harney is back, this time investigating murders in a notorious Chicago drug ring, which will lead him, his sister, and his new partner through a dangerous web of corrupt politicians, vengeful billionaires, and violent dark web conspiracies...."
genres = [
	{
		asin: '18574597011',
		name: 'Mystery, Thriller & Suspense',
		type: 'genre'
	},
	{ asin: '18574621011', name: 'Thriller & Suspense', type: 'tag' },
	{ asin: '18574623011', name: 'Crime Thrillers', type: 'tag' }
]
image = 'https://m.media-amazon.com/images/I/91H9ynKGNwL.jpg'
export const combinedB08C6YJ1LS: ApiBook = setupMinimalParsed(
	B08C6YJ1LS.product,
	description,
	image,
	genres
)
