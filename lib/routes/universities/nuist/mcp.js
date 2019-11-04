const got = require('@/utils/got');
const cheerio = require('cheerio');
const FormData = require('form-data');

const baseTitle = '南信大信息公告栏';
const indexAPI = `http://mcp.nuist.edu.cn/wechat/new_bulletin/index.do?index`,
    detailAPI = `http://mcp.nuist.edu.cn/wechat/new_bulletin/index.do?detail`;

const Categories = {
    //  "791": { typeName: "全部" }
    '792': { typeName: '文件公告', typeId: 0 },
    //  xsbgw: { typeName: "学术报告" },
    '779': { typeName: '招标信息', typeId: 758 },
    '780': { typeName: '会议通知', typeId: 759 },
    '781': { typeName: '党政事务', typeId: 760 },
    '782': { typeName: '组织人事', typeId: 761 },
    '783': { typeName: '科研信息', typeId: 762 },
    '784': { typeName: '招生就业', typeId: 763 },
    '785': { typeName: '教学考试', typeId: 764 },
    '786': { typeName: '专题讲座', typeId: 765 },
    '787': { typeName: '观点论坛', typeId: 766 },
    '788': { typeName: '校园活动', typeId: 767 },
    '789': { typeName: '学院动态', typeId: 768 },
    qt: { typeName: '其他', typeId: 884 },
};

module.exports = async (ctx) => {
    const cid = Categories.hasOwnProperty(ctx.params.category) ? ctx.params.category : '792';

    const indexForm = new FormData();
    indexForm.append('typeId', Categories[cid].typeId), indexForm.append('currentPage', '1'), indexForm.append('pageSize', 20), indexForm.append('keyword', ''), indexForm.append('department', '全部');
    const response = await got.post(indexAPI, { body: indexForm, json: true });
    const list = response.body && JSON.parse(response.body);
    const items = await Promise.all(
        [...list].map(async (item) => {
            const cache = await ctx.cache.get(`nuist-mcp-${item.id}`);
            if (cache) {
                return JSON.parse(cache);
            }

            const detailForm = new FormData();
            detailForm.append('id', item.id);
            const res = await got.post(detailAPI, { body: detailForm });
            const $ = cheerio.load(res.body);

            const time = new Date(item.addtime);
            item = {
                title: parseInt(item.ontop) === 1 ? `[置顶] ${item.title}` : item.title,
                author: item.department,
                category: item.classname,
                description: $('.AnnouncementDetailConent').html(),
                pubDate: time.toUTCString(),
                link: `https://bulletin.nuist.edu.cn/${time.getFullYear()}/${time
                    .getMonth()
                    .toString()
                    .padStart(2, '0')}${time
                    .getDay()
                    .toString()
                    .padStart(2, '0')}/c791a${item.id}/page.htm`,
            };
            ctx.cache.set(`nuist-mcp-${item.id}`, JSON.stringify(item));
            return Promise.resolve(item);
        })
    );

    ctx.state.data = {
        title: `${baseTitle}: ${Categories[cid].typeName}`,
        author: 'gylidian',
        link: 'http://mcp.nuist.edu.cn/wechat/new_bulletin/index.do?Index',
        description: '南京信息工程大学信息公告栏新接口，无需校内VPN即可访问，https://gylidian.github.io',
        items,
    };
};
