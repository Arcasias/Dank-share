chrome.storage.sync.get(['storageSet', 'active'], function (result) {
'use strict';

// 'storageSet' is used to know whether the variables have been set
// Active is true by default
if (!result.storageSet || result.storageSet !== 'set') {
    chrome.storage.sync.set({
        active: true,
        storageSet: 'set',
        username: "",
        webhooks: [],
    });
    result.active = true;
}
if (!result.active) {
    return;
}

/**
 * CONSTANTS
 */
const MAX_CACHE_SIZE = 1000;
const img_cache = [];
const yeetUrl = chrome.extension.getURL('images/yeet32.png');


/**
 * HELPERS
 */

/**
 * Checks whether an image is above the minimum size to be allowed to be shared.
 * 
 * @param  {Number} width
 * @param  {Number} height
 * @return {Boolean}
 */
function checkImageSize(width, height) {
    return width * height >= 32000 &&
        width > 48 &&
        height > 48;
}

/**
 * Tries to apply a Yeet to every image found inside a node.
 * Every "yeeted" image is cached so that older yeets can be deleted when
 * too many images are injected.
 * 
 * @param  {HTMLElement} node
 */
function injectYeets(node) {
    const imgs = node.tagName === 'IMG' ?
        [node] : node.getElementsByTagName ?
        [...node.getElementsByTagName('img')] : [];
    imgs.forEach(img => {
        onImgLoad(img, () => {
            const rect = img.getBoundingClientRect();
            if (checkImageSize(rect.width, rect.height) &&
                !img_cache.find(cached => cached.img === img)) {
                const yeet = new Yeet();
                yeet.attachTo(img);
                img_cache.push({ img, yeet });
                // Remove last entry if cashe is full
                if (img_cache.length > MAX_CACHE_SIZE) {
                    const cached = img_cache.shift();
                    cached.yeet.remove();
                }
            }
        });
    });
}

/**
 * Ensures that a callback is executed once a given image is fully loaded.
 * 
 * @param  {HTMLImageElement} img
 * @param  {Function} callback
 */
function onImgLoad(img, callback) {
    if (img.complete) {
        callback();
    } else {
        img.addEventListener('load', callback);
    }
}

/**
 * Gets a random array item index.
 * 
 * @param  {Array} array
 * @return {Number}
 */
function randIndex(array) {
    return Math.floor(Math.random() * array.length);
}

/**
 * CLASSES
 */

class Color {

    /**
     * Helper class allowing more flexibility with colors handling.
     *
     * @constructor
     * @param  {Number} r Initial red band
     * @param  {Number} g Initial green band
     * @param  {Number} b Initial blue band
     */
    constructor(r=0, g=0, b=0) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    /**
     * Gets the color in decimal notation.
     * @return {Number}
     */
    get decimal() {
        return parseInt(this.hex, 16);
    }

    /**
     * Gets the color in hexcadecimal notation.
     * @return {String}
     */
    get hex() {
        return [
            this.r.toString(16).padStart(2, '0'),
            this.g.toString(16).padStart(2, '0'),
            this.b.toString(16).padStart(2, '0'),
        ].join('');
    }

    /**
     * Gets the hue according to the HSL calculation.
     * @return {Number}
     */
    get hue() {
        let r = this.r / 255;
        let g = this.g / 255;
        let b = this.b / 255;

        let cmin = Math.min(r, g, b);
        let cmax = Math.max(r, g, b);
        let delta = cmax - cmin;
        let h = 0;

        if (delta == 0) {
            h = 0;
        } else if (cmax == r) {
            h = ((g - b) / delta) % 6;
        } else if (cmax == g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) {
            h += 360;
        }
        return h;
    }

    /**
     * Gets the color that should be applied to any overlapping text.
     * @return {String} black ('000000') or white ('ffffff')
     */
    get inverse() {
        if (this.r + this.g + this.b === 255) {
            return 'ffffff';
        } else {
            return this.hue > 180 ? 'ffffff' : '000000';
        }
    }

    /**
     * Sets own color to a newly highly-contrasted generated one.
     * 
     * @return {Color}
     */
    random() {
        const availableColors = [0, 1, 2];
        const lastColors = [0, 127, 255];
        const max = availableColors.splice(randIndex(availableColors), 1);
        const min = availableColors.splice(randIndex(availableColors), 1);
        const last = availableColors.shift();

        const color = new Array(3);
        color[max] = 255;
        color[min] = 0;
        color[last] = lastColors[randIndex(lastColors)];

        this.r = color[0];
        this.g = color[1];
        this.b = color[2];

        return this;
    }
}

class Yeet {

    /**
     * Represents a sharing button injectable on an image.
     * Handles the state of its button, wrapper and image.
     */
    constructor() {
        this.color = new Color();
        this.color.random();

        this.btn = document.createElement('button');
        this.btn.classList.add('dank-share-btn');

        this.btnImg = document.createElement('img');
        this.btnImg.classList.add('dank-share-img');
        this.btnImg.src = yeetUrl;
        this.btnImg.dataset.yeet = true;
        this.btnImg.yeet = true;

        this.btnTxt = document.createElement('div');
        this.btnTxt.classList.add('dank-share-txt');
        this.btnTxt.innerHTML = "Share";
        this.btnTxt.style.backgroundColor = '#' + this.color.hex;
        this.btnTxt.style.color = '#' + this.color.inverse;

        this.btn.append(this.btnTxt);
        this.btn.append(this.btnImg);
    }

    /**
     * Attache the Yeet button to an image.
     * 
     * @param  {HTMLImageElement} img
     */
    attachTo(img) {
        this.btn.style.left = (img.offsetLeft + img.clientWidth - 24 - 8) + 'px';
        this.btn.style.top = (img.offsetTop + 8) + 'px';
        this.btn.addEventListener('click', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            this.post(img.src);
        });
        img.parentNode.prepend(this.btn);
    }

    /**
     * Sends the image to all active webhooks, encapsulated inside a JSON embed.
     * 
     * @param  {String} imgUrl
     */
    post(imgUrl) {
        chrome.storage.sync.get(['username', 'webhooks'], result => {
            const embedData = {
                username: "Dank Share",
                avatar_url: 'https://i.kym-cdn.com/photos/images/original/001/318/758/bbe.png',
                embeds: [
                    {
                        image: { url: imgUrl },
                        color: this.color.decimal,
                    },
                ],
            };
            if (result.username && result.username.length) {
                embedData.embeds[0].footer = {
                    text: `Sent by ${result.username}`,
                };
            }
            let sent = 0;
            result.webhooks.forEach(webhook => {
                if (!webhook.active || !webhook.url.length) {
                    return;
                }
                const xhr = new XMLHttpRequest();
                xhr.open('POST', webhook.url, true);
                xhr.setRequestHeader('Content-type', 'application/json');
                xhr.send(JSON.stringify(embedData));
                sent ++;
            });
            console.info(`%cImage sent to ${sent} webhook${sent.length > 1 ? 's' : ''}.`, `color: #${this.color.hex}`);
        });
    }

    /**
     * Removes the Yeet from its parent image.
     */
    remove() {
        this.btn.parentNode.removeChild(this.btn);
    }
}


/**
 * MAIN
 */

// Observer looking for new images to inject
const observer = new MutationObserver((list, observer) => {
    list.forEach(mutation => {
        let nodes = [];
        switch (mutation.type) {
            case 'attributes':
                nodes = [mutation.target];
                break;
            case 'childList':
                if (!mutation.addedNodes.length) {
                    return;
                }
                nodes = [...mutation.addedNodes];
                break;
        }
        nodes.forEach(injectYeets);
    });
});
observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['src'],
    childList: true,
    subtree: true,
});

// Initial injection
injectYeets(document.body);

});
