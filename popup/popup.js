'use strict';

/**
 * VARIABLES
 */
const MAX_COUNT = 10;
const INPUT_MAX_LENGTH = 32;

const manifest = chrome.runtime.getManifest();

const buttonAdd = document.getElementById('button-add');
const buttonStatus = document.getElementById('button-status');
const imgLogo = document.getElementById('img-logo');
const inputUsername = document.getElementById('input-username');
const labelCount = document.getElementById('label-count');
const labelEmpty = document.getElementById('label-empty');
const labelVersion = document.getElementById('label-version');
const tableWebhooks = document.getElementById('table-webhooks').getElementsByTagName('tbody')[0];
const templateWebhook = document.getElementById('template-webhook');

let active = false;
let color = [255, 0, 0];
let colorPtr = 2;
let colorMult = 1;
let rgbActive = true;
let status = true;


/**
 * HELPERS
 */

/**
 * Called on each frame. Handles the color changing feature.
 */
function animate() {
    if (rgbActive) {
        color[colorPtr % 3] = Math.max(Math.min(color[colorPtr % 3] + 1 * colorMult, 255), 0);
        if ((colorMult > 0 && color[colorPtr % 3] == 255) ||
            (colorMult < 0 && color[colorPtr % 3] == 0)) {
            colorPtr ++;
            colorMult *= -1;
        }
        const hexColor = '#' + color.map(color => color.toString(16).padStart(2, '0')).join('');
        [...document.getElementsByClassName('colored')].forEach(el => {
            el.style.color = hexColor;
            el.style.outlineColor = hexColor;
        });
    }
    requestAnimationFrame(animate);
}

/**
 * Abreviation + promisification of the `chrome.storage.sync.get` function.
 * 
 * @param  {...String[]} keys
 * @return {Promise}
 */
function storageGet(...keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, resolve);
    });
}

/**
 * Abreviation + promisification of the `chrome.storage.sync.set` function.
 * 
 * @param  {data} keys
 * @return {Promise}
 */
function storageSet(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(data, resolve);
    });
}


/**
 * CLASSES
 */
class Webhook {

    // Contains all webhooks
    static list = [];
    
    /**
     * Updates the adequate styles based on the list state.
     */
    static updateStyles() {
        labelCount.innerHTML = `${Webhook.list.length}/${MAX_COUNT}`;
        tableWebhooks.style.display = Webhook.list.length === 0 ? 'none' : 'table';
        labelEmpty.style.display = Webhook.list.length === 0 ? 'block' : 'none';
        buttonAdd.style.display = Webhook.list.length < MAX_COUNT ? 'block' : 'none';
    }

    /**
     * Represents a webhook (both the element and the logical object).
     *
     * @constructor
     * @param  {Boolean} active Whether the webhook should be targeted by image sharing
     * @param  {String}  alias  Local name of the webhook
     * @param  {String}  url    Image dispatching address
     * @param  {Boolean} edit   Whether the webhook should be editable on init
     */
    constructor(active, alias, url, edit=false) {
        this.active = active;
        this.alias = alias;
        this.url = url;
        this.editing = edit;

        // Initialize main component
        this.element = templateWebhook.cloneNode(true);
        this.element.id = null;
        this.element.classList.remove('template');
        if (!this.active) {
            this.element.classList.add('inactive');
        }

        // Initialize sub components
        this.components = new Map();
        this.components.set('active', this.find('webhook-active'));
        this.components.set('alias', this.find('webhook-alias'));
        this.components.set('url', this.find('webhook-url'));
        this.components.set('edit', this.find('webhook-edit'));
        this.components.set('remove', this.find('webhook-remove'));

        // Set values
        this.components.get('active').checked = this.active;
        this.components.get('alias').value = this.alias;
        this.components.get('url').value = this.url;

        // Bind event listeners
        this.element.onmousedown = this.onRowMousedown.bind(this);
        this.components.get('active').onchange = this.onActiveChange.bind(this);
        this.components.get('alias').onchange = this.onAliasChange.bind(this);
        this.components.get('alias').onkeydown = this.onAliasKeydown.bind(this);
        this.components.get('url').onchange = this.onUrlChange.bind(this);
        this.components.get('url').onkeydown = this.onUrlKeydown.bind(this);
        this.components.get('edit').onclick = this.onEditClick.bind(this);
        this.components.get('remove').onclick = this.onRemoveClick.bind(this);

        if (this.editing) {
            this.startEdit();   
        }

        // Update list styles
        Webhook.list.push(this);
        Webhook.updateStyles();
    }

    /**
     * Removes the webhook both from the DOM and from the list.
     */
    destroy() {
        this.element.parentNode.removeChild(this.element);
        Webhook.list.splice(Webhook.list.indexOf(this), 1);
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

    /**
     * Helper function getting the first child element matching a class name.
     * 
     * @param  {String} className
     * @return {HTMLElement}
     */
    find(className) {
        return this.element.getElementsByClassName(className)[0];
    }

    /**
     * Allows the webhook to be edited.
     */
    startEdit() {
        Webhook.list.forEach(webhook => {
            if (webhook.editing) {
                webhook.stopEdit();
            }
        });
        this.editing = true;
        this.element.classList.add('editing');
    }

    /**
     * Stops webhook edition.
     */
    stopEdit() {
        this.editing = false;
        this.element.classList.remove('editing');
    }

    // Event handlers
    /**
     * Drag & drop feature, allowing to re-order webhooks.
     * 
     * @param  {Event} ev
     */
    onRowMousedown(ev) {
        console.log(ev);
        if (this.editing || !ev.target.classList.contains('td-inputs')) {
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        let coord = this.element.getBoundingClientRect();
        const rowHeight = coord.height;
        let rowPosition = Webhook.list.indexOf(this);
        this.element.classList.add('dragging');
        window.onmousemove = ev => {
            ev.preventDefault();
            ev.stopPropagation();
            if (Webhook.list.length <= 1) {
                return;
            }
            let newPosition;
            if (ev.clientY < coord.y) {
                newPosition = Math.max(rowPosition - 1, 0);
            } else if(ev.clientY > coord.y + coord.height) {
                newPosition = Math.min(rowPosition + 1, Webhook.list.length);
            } else {
                return;
            }
            if (newPosition === rowPosition) {
                return;
            }
            Webhook.list.splice(rowPosition, 1);
            Webhook.list.splice(newPosition, 0, this);
            tableWebhooks.removeChild(this.element);
            if (newPosition === Webhook.list.length - 1) {
                tableWebhooks.append(this.element);
            } else {
                tableWebhooks.insertBefore(this.element, tableWebhooks.children[newPosition]);
            }
            rowPosition = newPosition;
            coord = this.element.getBoundingClientRect();
        };
        window.onmouseup = ev => {
            ev.preventDefault();
            ev.stopPropagation();
            window.onmousemove = null;
            window.onmouseup = null;
            this.element.classList.remove('dragging');
            storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
        };
    }

    /**
     * Updates the `active` property.
     * ` 
     * @param  {Event} ev
     */
    onActiveChange(ev) {
        this.active = this.components.get('active').checked;
        this.element.classList.toggle('inactive', !this.active);
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

    /**
     * Updates the `alias` property.
     * ` 
     * @param  {Event} ev
     */
    onAliasChange(ev) {
        this.alias = this.components.get('alias').value;
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

    /**
     * Navigates to the `url` field when pressing ENTER and leaves the cell
     * when pressing ESCAPE.
     * ` 
     * @param  {Event} ev
     */
    onAliasKeydown(ev) {
        switch (ev.key) {
            case 'Enter':
                this.components.get('url').focus();
                break;
            case 'Escape':
                ev.preventDefault();
                document.activeElement.blur();
                this.stopEdit();
                break;
        }
    }

    /**
     * Updates the `url` property.
     * ` 
     * @param  {Event} ev
     */
    onUrlChange(ev) {
        this.url = this.components.get('url').value;
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

    /**
     * End edition when pressing either ENTER or ESCAPE.
     * ` 
     * @param  {Event} ev
     */
    onUrlKeydown(ev) {
        switch (ev.key) {
            case 'Enter':
                document.activeElement.blur();
                this.stopEdit();
                break;
            case 'Escape':
                ev.preventDefault();
                document.activeElement.blur();
                this.stopEdit();
                break;
            default:
                break;
        }
    }

    /**
     * Toggles edit mode.
     * 
     * @param  {Event} ev
     */
    onEditClick(ev) {
        this.components.get('edit').style.color = null;
        this.editing ? this.stopEdit() : this.startEdit();
    }

    /**
     * Deletes the webhook.
     * 
     * @param  {Event} ev
     */
    onRemoveClick(ev) {
        this.destroy();
    }
}


/**
 * EVENT LISTENERS
 */

/**
 * Toggles color changing feature.
 * 
 * @param  {Event} ev
 */
imgLogo.onclick = ev => {
    rgbActive = !rgbActive;
    if (!rgbActive) {
        [...document.getElementsByClassName('colored')].forEach(el => {
            el.style.color = null;
        });
    }
};

/**
 * Saves the `username` field.
 * 
 * @param  {Event} ev
 */
inputUsername.onchange = ev => {
    storageSet({ username: inputUsername.value });
};

/**
 * Exits the `username` edition when presing ENTER or ESCAPE.
 * 
 * @param  {Event} ev
 */
inputUsername.onkeydown = ev => {
    switch (ev.key) {
        case 'Enter':
            document.activeElement.blur();
            break;
        case 'Escape':
            ev.preventDefault();
            document.activeElement.blur();
            break;
    }
};

/**
 * Creates a new webhook in the list.
 * 
 * @param  {Event} ev
 */
buttonAdd.onclick = ev => {
    const newWebhook = new Webhook(true, "", "", true);
    tableWebhooks.append(newWebhook.element);
    storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
};

/**
 * Toggles the global state of the extension.
 * 
 * @param  {Event} ev
 */
buttonStatus.onclick = ev => {
    storageSet({ active: !status }).then(() => {
        status = !status;
        buttonStatus.classList.toggle('on', status);
    });
};


/**
 * MAIN
 */

/**
 * The main code is executed here to get all the required variables.
 * The steps are :
 * 1) Set both the `active` and `username` global values
 * 2) Fill the webhooks list with webhooks fetched from storage
 * 3) Sets the correct image and version number in the header
 */
storageGet('active', 'imageSize', 'username', 'webhooks').then(result => {
    status = result.active;
    inputUsername.value = result.username;
    result.webhooks.forEach(webhook => {
        const { active, alias, url } = webhook;
        new Webhook(active, alias, url);
    });
    if (!result.webhooks.length) {
        Webhook.updateStyles();
    } else {
        Webhook.list.forEach(webhook => {
            tableWebhooks.append(webhook.element);
        });
    }
    buttonStatus.classList.toggle('on', status);
    imgLogo.src = chrome.extension.getURL('images/yeet32.png');
    labelVersion.innerHTML = `v${manifest.version}`;
});

// Starts animation as soon as the code is finished.
animate();
