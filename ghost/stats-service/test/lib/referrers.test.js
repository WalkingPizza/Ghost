const knex = require('knex').default;
const assert = require('assert');
const ReferrersStatsService = require('../../lib/referrers');

describe('ReferrersStatsService', function () {
    describe('getReferrerHistory', function () {
        /** @type {import('knex').Knex} */
        let db;

        beforeEach(async function () {
            db = knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: ':memory:'
                }
            });

            await db.schema.createTable('members_created_events', function (table) {
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
            });
            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        async function insertEvents(sources) {
            const {DateTime} = require('luxon');
            const signupInsert = [];
            const paidInsert = [];

            for (let index = 0; index < sources.length; index++) {
                const day = DateTime.fromISO('1970-01-01').plus({days: index}).toISODate();
                if (index > 0) {
                    signupInsert.push({
                        referrer_source: sources[index],
                        referrer_medium: null,
                        referrer_url: null,
                        created_at: day
                    });
                }

                paidInsert.push({
                    referrer_source: sources[index],
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: day
                });
            }

            await db('members_created_events').insert(signupInsert);
            await db('members_subscription_created_events').insert(paidInsert);
        }

        it('Responds with correct data', async function () {
            const sources = ['Twitter', 'Ghost Newsletter', 'Ghost Explore', 'Product Hunt', 'Reddit', 'Facebook', 'Google', 'Direct', 'Other'];
            await insertEvents(sources);

            const stats = new ReferrersStatsService({knex: db});

            const results = await stats.getReferrersHistory();

            const finder = (source, date) => (result) => {
                return result.date === date && result.source === source;
            };

            // Is sorted by date
            assert.deepStrictEqual(results.data.map(result => result.date), ['1970-01-01', '1970-01-02', '1970-01-03', '1970-01-04', '1970-01-05', '1970-01-06', '1970-01-07', '1970-01-08', '1970-01-09']);

            const firstDayCounts = results.data.find(finder('Twitter', '1970-01-01'));
            const secondDayCounts = results.data.find(finder('Ghost Newsletter', '1970-01-02'));
            const thirdDayCounts = results.data.find(finder('Ghost Explore', '1970-01-03'));

            assert(firstDayCounts.signups === 0);
            assert(firstDayCounts.paid_conversions === 1);

            assert(secondDayCounts.signups === 1);
            assert(secondDayCounts.paid_conversions === 1);

            assert(thirdDayCounts.signups === 1);
            assert(thirdDayCounts.paid_conversions === 1);
        });
    });
});
