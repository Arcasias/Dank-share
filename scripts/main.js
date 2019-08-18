chrome.storage.sync.get(['active'], function (result) {
'use strict';

if (!result.active) {
    return;
}

/**
 * CONSTANTS
 */
const MAX_CACHE_SIZE = 1000
const MIN_WIDTH = 256;
const MIN_HEIGHT = 256;

const img_cache = [];


/**
 * HELPERS
 */
function randIndex(array) {
    return Math.floor(Math.random() * array.length);
}

function onImgLoad(img, callback) {
    if (img.complete) {
        callback();
    } else {
        img.addEventListener('load', callback);
    }
}

function injectYeets(node) {
    const imgs = node.tagName === 'IMG' ?
        [node] : node.getElementsByTagName ?
        [...node.getElementsByTagName('img')] : [];
    imgs.forEach(img => {
        onImgLoad(img, () => {
            const rect = img.getBoundingClientRect();
            if (rect.width > MIN_WIDTH && rect.height > MIN_HEIGHT
                && !img_cache.find(cached => cached.img === img)) {
                const yeet = new Yeet();
                yeet.attachTo(img);
                img_cache.push({ img, yeet });
                // Remove last entry if cashe is full
                if (img_cache.length > MAX_CACHE_SIZE) {
                    const cached = img_cache.shift();
                    cached.yeet.delete();
                }
            }
        });
    });
}

function clearYeets() {
    const cached = img_cache.shift();
    cached.yeet.delete();
}

function getHue(r,g,b) {
    // Make r, g, and b fractions of 1
    r /= 255;
    g /= 255;
    b /= 255;

    // Find greatest and smallest channel values
    let cmin = Math.min(r, g, b);
    let cmax = Math.max(r, g, b);
    let delta = cmax - cmin;
    let h = 0;
    // Calculate hue
    // No difference
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
    // Make negative hues positive behind 360°
    if (h < 0) {
        h += 360;
    }
}

/**
 * CLASSES
 */
class Color {

    constructor(r=0, g=0, b=0) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    get decimal() {
        return parseInt(this.hex, 16);
    }

    get hex() {
        return [
            this.r.toString(16).padStart(2, '0'),
            this.g.toString(16).padStart(2, '0'),
            this.b.toString(16).padStart(2, '0'),
        ].join('');
    }

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

    get inverse() {
        if (this.r + this.g + this.b === 255) {
            return 'ffffff';
        } else {
            return this.hue > 180 ? 'ffffff' : '000000';
        }
    }

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

    constructor() {
        this.color = new Color();
        this.color.random();

        this.btn = document.createElement('button');
        this.btn.classList.add('dank-share-btn');

        this.btnImg = document.createElement('img');
        this.btnImg.classList.add('dank-share-img')
        this.btnImg.src = chrome.extension.getURL('images/yeet32.png');
        this.btnImg.alt = "yeet";

        this.btnTxt = document.createElement('div');
        this.btnTxt.classList.add('dank-share-txt');
        this.btnTxt.innerHTML = "Share";
        this.btnTxt.style.backgroundColor = '#' + this.color.hex;
        this.btnTxt.style.color = '#' + this.color.inverse;

        this.btn.append(this.btnTxt);
        this.btn.append(this.btnImg);
    }

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
            console.log(`%cImage sent to ${sent} webhook${sent.length > 1 ? 's' : ''}.`, `color: #${this.color.hex}`);
        });
    }

    attachTo(img) {
        this.btn.style.left = (img.offsetLeft + img.clientWidth - 24 - 8) + 'px';
        this.btn.style.top = (img.offsetTop + 8) + 'px';
        this.btn.addEventListener("click", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            this.post(img.src);
        });
        img.parentNode.prepend(this.btn);
    }

    delete() {
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