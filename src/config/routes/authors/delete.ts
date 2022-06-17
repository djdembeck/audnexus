import { PaprAudibleAuthorHelper } from '#helpers/database/audible'
import SharedHelper from '#helpers/shared'
import { requestGeneric } from '#typing/requests'
import { FastifyInstance } from 'fastify'

async function routes(fastify: FastifyInstance) {
    fastify.delete<requestGeneric>('/authors/:asin', async (request, reply) => {
        // Setup Helpers
        const commonHelpers = new SharedHelper()
        const DbHelper = new PaprAudibleAuthorHelper(request.params.asin, {})

        // First, check ASIN validity
        if (!commonHelpers.checkAsinValidity(request.params.asin)) {
            reply.code(400)
            throw new Error('Bad ASIN')
        }

        const existingAuthor = await DbHelper.findOne()

        if (!existingAuthor) {
            reply.code(404)
            throw new Error(`${request.params.asin} not found in the database`)
        }

        const deletedAuthor = await DbHelper.delete()
        return deletedAuthor
    })
}

export default routes
