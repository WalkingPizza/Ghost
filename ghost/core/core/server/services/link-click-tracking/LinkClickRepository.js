const {LinkClick} = require('@tryghost/link-tracking');
const ObjectID = require('bson-objectid').default;

module.exports = class LinkClickRepository {
    /** @type {Object} */
    #MemberLinkClickEvent;

    /** @type {object} */
    #Member;

    /**
     * @param {object} deps
     * @param {object} deps.MemberLinkClickEvent Bookshelf Model
     * @param {object} deps.Member Bookshelf Model
     */
    constructor(deps) {
        this.#MemberLinkClickEvent = deps.MemberLinkClickEvent;
        this.#Member = deps.Member;
    }

    async getAll(options) {
        const collection = await this.#MemberLinkClickEvent.findAll(options);

        const result = [];

        for (const model of collection.models) {
            const member = await this.#Member.findOne({id: model.get('member_id')});
            result.push(new LinkClick({
                link_id: model.get('link_id'),
                member_uuid: member.get('uuid')
            }));
        }

        return result;
    }

    /**
     * @param {LinkClick} linkClick
     * @returns {Promise<void>}
     */
    async save(linkClick) {
        // Convert uuid to id
        const member = await this.#Member.findOne({uuid: linkClick.member_uuid});
        if (!member) {
            return;
        }

        const model = await this.#MemberLinkClickEvent.add({
            // Only store the parthname (no support for variable query strings)
            link_id: linkClick.link_id.toHexString(), 
            member_id: member.id
        }, {});

        linkClick.event_id = ObjectID.createFromHexString(model.id);
    }
};
