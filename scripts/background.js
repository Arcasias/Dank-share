/**
 * VARIABLES
 */
const ALL_WEBHOOK = 'All';
let reloadingMenu = Promise.resolve();

/**
 * Wraps the `chrome.contextMenus.create` inside a promise for proper chaining.
 * 
 * @param  {Object} data Menu data
 * @return {Promise}
 */
function createMenu(data) {
    return new Promise((resolve, reject) => {
        chrome.contextMenus.create(data, resolve);
    });
}

/**
 * Generates a random contrasted color in a decimal format.
 * @return {Number}
 */
function randColor() {
    const availableColors = [0, 1, 2];
    const lastColors = [0, 127, 255];
    const max = availableColors.splice(Math.floor(Math.random() * availableColors.length), 1);
    const min = availableColors.splice(Math.floor(Math.random() * availableColors.length), 1);
    const last = availableColors.shift();

    const color = new Array(3);
    color[max] = 255;
    color[min] = 0;
    color[last] = lastColors[Math.floor(Math.random() * lastColors.length)];

    return parseInt(color.map(col => col.toString(16).padStart(2, '0')).join(''), 16);
}

/**
 * Reloads the entire context menu according to the list length.
 *
 * @param {Webhooks[]} newValidWebhooks Webhook list
 * @return {Promise}
 */
function reloadMenu(newValidWebhooks) {
    reloadingMenu.then(() => {
        reloadingMenu = new Promise((resolve, reject) => {
            const menuPromises = [];
            chrome.contextMenus.removeAll(function () {
                // No valid webhook -> empty menu
                if (!newValidWebhooks.length) {
                    chrome.contextMenus.create({
                        id: 'dankShareEmpty',
                        title: "No webhook to share to",
                        contexts: ['image'],
                    });
                // One valid webhook -> single menu
                } else if (newValidWebhooks.length === 1) {
                    const webhook = newValidWebhooks[0];
                    menuPromises.push(createMenu({
                        id: `dankShareWebhook${webhook.order}`,
                        title: `Share to ${webhook.alias.length ? webhook.alias : (webhook.url.slice(0, 32) + "...")}`,
                        contexts: ['image'],
                    }));
                // Multiple valid webhooks -> parent menu + sub menus
                } else {
                    menuPromises.push(createMenu({
                        id: 'dankShareRoot',
                        title: "Share to",
                        contexts: ['image'],
                    }));
                    menuPromises.push(createMenu({
                        id: `dankShareWebhook${ALL_WEBHOOK}`,
                        title: "All",
                        contexts: ['image'],
                        parentId: 'dankShareRoot',
                    }));
                    newValidWebhooks.forEach(webhook => {
                        menuPromises.push(createMenu({
                            id: `dankShareWebhook${webhook.order}`,
                            title: webhook.alias.length ? webhook.alias : (webhook.url.slice(0, 32) + "..."),
                            contexts: ['image'],
                            parentId: 'dankShareRoot',
                        }));
                    });
                }
                Promise.all(menuPromises).then(resolve);
            });
        });
    });
}

/**
 * Sets the default variables when installed.
 */
chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.sync.set({
        night: false,
        status: true,
        username: "",
        webhooks: [],
    });
});

/**
 * Also sets an empty menu on images.
 */
chrome.contextMenus.create({
    id: 'dankShareEmpty',
    title: "No webhook to share to",
    contexts: ['image'],
});

/**
 * Updates the menu when the webhook list has changed
 */
chrome.storage.onChanged.addListener(function (changes, areaName) {
    // Only listens for updates on webhooks
    if (areaName === 'sync' && changes.webhooks) {
        const newValidWebhooks = changes.webhooks.newValue.filter(w => w.url.length);
        // Reloads the entire menu if at least one webhook changed
        // This is because I want the list to have the exact same order than the one in the pop-up
        reloadMenu(newValidWebhooks);
    }
});

/**
 * Shares an image to a specified target from the contextMenu
 */
chrome.contextMenus.onClicked.addListener(function (info) {
    // Filters on dankShare ids
    if (info.menuItemId.startsWith('dankShareWebhook')) {
        chrome.storage.sync.get(['username', 'webhooks'], result => {
            const targetOrder = info.menuItemId.split('dankShareWebhook').pop();
            const embedData = {
                username: "Dank Share",
                avatar_url: 'https://i.kym-cdn.com/photos/images/original/001/318/758/bbe.png',
                embeds: [
                    {
                        image: { url: info.srcUrl },
                        color: randColor(),
                    },
                ],
            };
            if (result.username && result.username.length) {
                embedData.embeds[0].footer = {
                    text: `Sent by ${result.username}`,
                };
            }
            const targetWebhooks = targetOrder === ALL_WEBHOOK ?
                result.webhooks : result.webhooks.filter(w => w.order == targetOrder); // filter because it's directly an array
            targetWebhooks.forEach(webhook => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', webhook.url, true);
                xhr.setRequestHeader('Content-type', 'application/json');
                xhr.send(JSON.stringify(embedData));
            });
        });
    }
});

// TODO : handle the "Extension context invalidated" error.
// There's this post on StackOverflow : https://stackoverflow.com/questions/53939205/how-to-avoid-extension-context-invalidated-errors-when-messaging-after-an-exte

// TODO 2 : try to adapt this for Firefox
// No clue where to start. 
