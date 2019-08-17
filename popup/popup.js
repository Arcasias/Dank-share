let color = [255, 0, 0];
let colorPtr = 2;
let colorMult = 1;

const MAX_AMOUNT = 10;

const manifest = chrome.runtime.getManifest();

const statusIcon =          document.getElementById('status');
const versionNumber =       document.getElementById('version');
const webhooksContainer =   document.getElementById('webhooks');
const webhooksEmpty =       document.getElementById('webhooks-empty');
const webhooksAmount =      document.getElementById('webhooks-amount');

const actionAdd =           document.getElementById('action-add');
const actionToggle =        document.getElementById('action-toggle');

let status = false;

function animate() {
    color[colorPtr % 3] = Math.max(Math.min(color[colorPtr % 3] + 1 * colorMult, 255), 0);
    if ((colorMult > 0 && color[colorPtr % 3] == 255) ||
        (colorMult < 0 && color[colorPtr % 3] == 0)) {
        colorPtr ++;
        colorMult *= -1;
    }

    let hexColor = '#' + color.map(color => color.toString(16).padStart(2, '0')).join('');
    [...document.getElementsByClassName('colored')].forEach(el => {
        el.style.color = hexColor;
        el.style.outlineColor = hexColor;
    });
    requestAnimationFrame(animate);
}

class Webhook {

    static list = [];
    static get data() {
        return Webhook.list.map(w => {
            return {
                value: w.input.value,
                active: w.active.checked,
                alias: w.alias.value,
            }
        });
    }
    static get size() {
        return Webhook.list.length;
    }
    static updateStyles(callback) {
        webhooksAmount.innerHTML = `${this.size}/${MAX_AMOUNT}`;
        webhooksEmpty.style.display = this.size === 0 ? 'block' : 'none';
        actionAdd.style.display = this.size < MAX_AMOUNT ? 'block' : 'none';
    }

    constructor(value, active, alias) {
        // Container row
        this.parentRow = document.createElement('div');
        this.parentRow.classList.add('row');

        // Alias
        this.alias = document.createElement('input');
        this.alias.classList = 'colored alias';
        this.alias.value = alias || "";
        this.alias.placeholder = "Alias";
        this.alias.onchange = ev => {
            chrome.storage.sync.set({ webhooks: Webhook.data }, () => {
                Webhook.updateStyles();
            });
        };

        // Main input
        this.input = document.createElement('input');
        this.input.classList = 'colored webhook';
        this.input.value = value || "";
        this.input.placeholder = "Paste your webhook here";
        this.input.onfocus = ev => {
            this.input.style.width = '100%';
            this.removeButton.style.opacity = 0;
        };
        this.input.onblur = ev => {
            this.input.style.width = '30%';
            this.removeButton.style.opacity = 1;
        };
        this.input.onchange = ev => {
            chrome.storage.sync.set({ webhooks: Webhook.data }, () => {
                Webhook.updateStyles();
            });
        };

        // Remove button
        this.removeButton = document.createElement('i');
        this.removeButton.classList = 'fas fa-times remove';
        this.removeButton.onclick = ev => {
            this.remove();
        };

        // Activate checkbox
        this.checkboxContainer = document.createElement('label');
        this.checkboxContainer.classList = 'cb-container';

        this.checkmark = document.createElement('span');
        this.checkmark.classList = 'cb-checkmark';

        this.active = document.createElement('input');
        this.active.classList = 'activate';
        this.active.type = 'checkbox';
        this.active.checked = active;
        this.active.onchange = ev => {
            this.parentRow.classList.toggle('inactive', !this.active.checked);
            chrome.storage.sync.set({ webhooks: Webhook.data }, () => {
                Webhook.updateStyles();
            });
        };

        // Attach everything together
        this.checkboxContainer.append(this.active);
        this.checkboxContainer.append(this.checkmark);
        this.parentRow.append(this.checkboxContainer);
        this.parentRow.append(this.alias);
        this.parentRow.append(this.input);
        this.parentRow.append(this.removeButton);
        this.parentRow.classList.toggle('inactive', !this.active.checked);
        webhooksContainer.append(this.parentRow);

        // Update list styles
        Webhook.list.push(this);
        Webhook.updateStyles();
    }

    remove() {
        this.parentRow.parentNode.removeChild(this.parentRow);
        Webhook.list.splice(Webhook.list.indexOf(this), 1);
        chrome.storage.sync.set({ webhooks: Webhook.data });
        Webhook.updateStyles();
    }
}

versionNumber.innerHTML = `(v${manifest.version})`;

// Events
actionAdd.addEventListener('click', ev => {
    new Webhook("", true);
    chrome.storage.sync.set({ webhooks: Webhook.data });
    Webhook.updateStyles();
});

actionToggle.addEventListener('click', ev => {
    chrome.storage.sync.set({ active: !status }, () => {
        status = !status;
        statusIcon.classList.toggle('on', status);
    });
});

chrome.storage.sync.get(['webhooks'], result => {
    if (result.webhooks) {
        result.webhooks.forEach(data => {
            const { value, active, alias } = data;
            new Webhook(value, active, alias);
        });
        if (!result.webhooks.length) {
            Webhook.updateStyles();
        }
    } else {
        chrome.storage.sync.set({ webhooks: Webhook.list });
    }
});

chrome.storage.sync.get(['active'], result => {
    if (result.active) {
        status = result.active;
        statusIcon.classList.toggle('on', status);
    } else {
        chrome.storage.sync.set({ active: true }, () => {
            status = true;
            statusIcon.classList.toggle('on', true);
        });
    }
});

animate();
