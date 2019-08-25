document.body.classList.add('debug');
const debugData = {
    night: true,
    status: true,
    username: 'Developer',
    webhooks: [
        {
            active: true,
            alias: 'First webhook',
            order: 0,
            url: 'https://webhook.url/1',
        },
        {
            active: false,
            alias: 'Second webhook',
            order: 1,
            url: 'https://webhook.url/2',
        },
        {
            active: true,
            alias: 'Third webhook',
            order: 2,
            url: 'https://webhook.url/3',
        },
    ],
};
window.chrome = {
    runtime: {
        getManifest: x => {
            return {
                version: '0',
                name: "Dank Share",
            };
        },
    },
    storage: {
        sync: {
            get: (keys, cb) => {
                return cb(debugData);
            },
            set: (data, cb) => {
                console.log("Data updated on the storage", Object.keys(data));
                Object.assign(debugData, data);
                return cb ? cb(true) : true;
            },
        },
    },
};
