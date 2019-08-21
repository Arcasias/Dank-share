'use strict';

// VARIABLES
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

// HELPERS
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

function storageGet(...keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, resolve);
    });
}

function storageSet(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(data, resolve);
    });
}

// CLASSES
class Webhook {

    static list = [];
    static get count() {
        return Webhook.list.length;
    }
    static updateStyles(callback) {
        labelCount.innerHTML = `${Webhook.count}/${MAX_COUNT}`;
        tableWebhooks.style.display = Webhook.count === 0 ? 'none' : 'table';
        labelEmpty.style.display = Webhook.count === 0 ? 'block' : 'none';
        buttonAdd.style.display = Webhook.count < MAX_COUNT ? 'block' : 'none';
    }

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

    destroy() {
        this.element.parentNode.removeChild(this.element);
        Webhook.list.splice(Webhook.list.indexOf(this), 1);
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

    find(className) {
        return this.element.getElementsByClassName(className)[0];
    }

    startEdit() {
        Webhook.list.forEach(webhook => {
            if (webhook.editing) {
                webhook.stopEdit();
            }
        });
        this.editing = true;
        this.element.classList.add('editing');
    }

    stopEdit() {
        this.editing = false;
        this.element.classList.remove('editing');
    }

    // Event handlers
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
            if (Webhook.count <= 1) {
                return;
            }
            let newPosition;
            if (ev.clientY < coord.y) {
                newPosition = Math.max(rowPosition - 1, 0);
            } else if(ev.clientY > coord.y + coord.height) {
                newPosition = Math.min(rowPosition + 1, Webhook.count);
            } else {
                return;
            }
            if (newPosition === rowPosition) {
                return;
            }
            Webhook.list.splice(rowPosition, 1);
            Webhook.list.splice(newPosition, 0, this);
            tableWebhooks.removeChild(this.element);
            if (newPosition === Webhook.count - 1) {
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

    onActiveChange(ev) {
        this.active = this.components.get('active').checked;
        this.element.classList.toggle('inactive', !this.active);
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

    onAliasChange(ev) {
        this.alias = this.components.get('alias').value;
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
    }

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

    onUrlChange(ev) {
        this.url = this.components.get('url').value;
        storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles)
    }

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

    onEditClick(ev) {
        this.components.get('edit').style.color = null;
        this.editing ? this.stopEdit() : this.startEdit();
    }

    onRemoveClick(ev) {
        this.destroy();
    }
}

imgLogo.src = chrome.extension.getURL('images/yeet32.png');
labelVersion.innerHTML = `v${manifest.version}`;

// Event listeners
imgLogo.onclick = ev => {
    rgbActive = !rgbActive;
    if (!rgbActive) {
        [...document.getElementsByClassName('colored')].forEach(el => {
            el.style.color = null;
        });
    }
};

inputUsername.onchange = ev => {
    storageSet({ username: inputUsername.value });
};
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

buttonAdd.onclick = ev => {
    const newWebhook = new Webhook(true, "", "", true);
    tableWebhooks.append(newWebhook.element);
    storageSet({ webhooks: Webhook.list }).then(Webhook.updateStyles);
};

buttonStatus.onclick = ev => {
    storageSet({ active: !status }).then(() => {
        status = !status;
        buttonStatus.classList.toggle('on', status);
    });
};

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
});

animate();
window.Webhook = Webhook;
