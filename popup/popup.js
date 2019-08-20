let color = [255, 0, 0];
let colorPtr = 2;
let colorMult = 1;

const MAX_AMOUNT = 10;
const INPUT_MAXLENGTH = 32;

const manifest = chrome.runtime.getManifest();

const statusIcon =          document.getElementById('status');
const versionNumber =       document.getElementById('version');
const logo =                document.getElementById('logo');
const usernameInput =       document.getElementById('username');
const imageSizeSelect =     document.getElementById('image-size');
const webhooksList =        document.getElementById('webhooks-list');
const webhooksTable =       document.getElementById('webhooks-table');
const webhooksEmpty =       document.getElementById('webhooks-empty');
const webhooksAmount =      document.getElementById('webhooks-amount');

const actionAdd =           document.getElementById('action-add');
const actionToggle =        document.getElementById('action-toggle');

let status = false;
let dank = true;

function animate() {
    if (dank) {
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
    }
    requestAnimationFrame(animate);
}

function nameLimiter(ev) {
    const input = ev.target;
    if (input.value.length > INPUT_MAXLENGTH) {
        input.value = input.value.slice(0, 32);
    }
}

class Webhook {

    static list = [];
    static get size() {
        return Webhook.list.length;
    }
    static render() {
        webhooksList.innerHTML = "";
        this.list.forEach(webhook => {
            webhooksList.append(webhook.element);
        })
    }
    static updateStyles(callback) {
        webhooksAmount.innerHTML = `${this.size}/${MAX_AMOUNT}`;
        webhooksTable.style.display = this.size === 0 ? 'none' : 'table';
        webhooksEmpty.style.display = this.size === 0 ? 'block' : 'none';
        actionAdd.style.display = this.size < MAX_AMOUNT ? 'block' : 'none';
    }

    constructor(url, active, alias, edit=false) {
        this.active = active;        
        this.alias = alias;        
        this.url = url;

        // Container row
        this.element = document.createElement('tr');
        this.element.classList.toggle('editing', edit);
        this.element.onclick = ev => {
            if (!this.element.classList.contains('editing')) {
                this.editButton.classList.add('grow');
            }
        };
        this.element.onmousedown = ev => {
            if (this.element.classList.contains('editing') ||
                ev.target.classList.contains('edit') ||
                ev.target.classList.contains('cb-checkmark')) {
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
                if (Webhook.size <= 1) {
                    return;
                }
                let newPosition;
                if (ev.clientY < coord.y) {
                    newPosition = Math.max(rowPosition - 1, 0);
                } else if(ev.clientY > coord.y + coord.height) {
                    newPosition = Math.min(rowPosition + 1, Webhook.size);
                } else {
                    return;
                }
                if (newPosition === rowPosition) {
                    return;
                }
                Webhook.list.splice(rowPosition, 1);
                Webhook.list.splice(newPosition, 0, this);
                webhooksList.removeChild(this.element);
                if (newPosition === Webhook.size - 1) {
                    webhooksList.append(this.element);
                } else {
                    webhooksList.insertBefore(this.element, webhooksList.children[newPosition]);
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
                chrome.storage.sync.set({ webhooks: Webhook.list }, () => {
                    Webhook.updateStyles();
                });
            };
        };

        // Container table cells
        const active_td = document.createElement('td');
        active_td.classList.add('active-td');
        const input_td = document.createElement('td');
        input_td.classList.add('input-td');
        const controls_td = document.createElement('td');
        controls_td.classList.add('controls-td');

        // Activate checkbox
        const checkboxContainer = document.createElement('label');
        checkboxContainer.classList = 'cb-container';

        const checkmark = document.createElement('span');
        checkmark.classList = 'cb-checkmark';

        const activeCheckbox = document.createElement('input');
        activeCheckbox.classList = 'activate';
        activeCheckbox.type = 'checkbox';
        activeCheckbox.checked = active;
        activeCheckbox.onchange = ev => {
            this.active = activeCheckbox.checked;
            this.element.classList.toggle('inactive', !this.active);
            chrome.storage.sync.set({ webhooks: Webhook.list }, () => {
                Webhook.updateStyles();
            });
        };

        // Alias input
        const aliasInput = document.createElement('input');
        aliasInput.classList = 'colored alias';
        aliasInput.value = alias || "";
        aliasInput.placeholder = "Alias";
        aliasInput.onchange = ev => {
            this.alias = aliasInput.value;
            chrome.storage.sync.set({ webhooks: Webhook.list }, () => {
                Webhook.updateStyles();
            });
        };
        aliasInput.oninput = nameLimiter;
        aliasInput.onkeydown = ev => {
            switch (ev.key) {
                case 'Enter':
                    urlInput.focus();
                    break;
                case 'Escape':
                    ev.preventDefault();
                    document.activeElement.blur();
                    this.stopEdit();
                    break;
                default:
                    break;
            }
        };

        // Main input
        const urlInput = document.createElement('input');
        urlInput.classList = 'colored webhook';
        urlInput.value = url || "";
        urlInput.placeholder = "URL";
        urlInput.onchange = ev => {
            this.url = urlInput.value;
            chrome.storage.sync.set({ webhooks: Webhook.list }, () => {
                Webhook.updateStyles();
            });
        };
        urlInput.onkeydown = ev => {
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
        };

        // Edit button
        this.editButton = document.createElement('i');
        this.editButton.title = "Edit";
        this.editButton.onclick = ev => {
            this.editButton.style.color = null;
            this.element.classList.contains('editing') ?
                this.stopEdit() :
                this.startEdit();
        };
        edit ? this.startEdit() : this.stopEdit();

        // Remove button
        const removeButton = document.createElement('i');
        removeButton.title = "Delete webhook";
        removeButton.classList = 'fas fa-times remove';
        removeButton.onclick = ev => {
            this.remove();
        };

        // Attach everything together
        checkboxContainer.append(activeCheckbox);
        checkboxContainer.append(checkmark);
        active_td.append(checkboxContainer);
        input_td.append(aliasInput);
        input_td.append(urlInput);
        controls_td.append(this.editButton);
        controls_td.append(removeButton);
        this.element.append(active_td);
        this.element.append(input_td);
        this.element.append(controls_td);
        this.element.classList.toggle('inactive', !activeCheckbox.checked);

        // Update list styles
        Webhook.list.push(this);
        Webhook.updateStyles();
    }

    startEdit() {
        Webhook.list.forEach(webhook => {
            webhook.stopEdit();
        })
        this.element.classList.add('editing');
        this.editButton.classList = 'fas fa-check edit';
    }

    stopEdit() {
        this.element.classList.remove('editing');
        this.editButton.classList = 'fas fa-pen edit colored';
    }

    remove() {
        this.element.parentNode.removeChild(this.element);
        Webhook.list.splice(Webhook.list.indexOf(this), 1);
        chrome.storage.sync.set({ webhooks: Webhook.list });
        Webhook.updateStyles();
    }
}

logo.src = chrome.extension.getURL('images/yeet32.png');
versionNumber.innerHTML = `v${manifest.version}`;

// Event listeners
logo.onclick = ev => {
    dank = !dank;
    if (!dank) {
        [...document.getElementsByClassName('colored')].forEach(el => {
            el.style.color = null;
        });
    }
};

usernameInput.onchange = ev => {
    chrome.storage.sync.set({ username: usernameInput.value });
};
usernameInput.oninput = nameLimiter;
usernameInput.onkeydown = ev => {
    switch (ev.key) {
        case 'Enter':
            document.activeElement.blur();
            break;
        case 'Escape':
            ev.preventDefault();
            document.activeElement.blur();
            break;
        default:
            break;
    }
};

imageSizeSelect.onchange = ev => {
    chrome.storage.sync.set({ imageSize: parseInt(imageSizeSelect.value) });
};

actionAdd.onclick = ev => {
    new Webhook("", true, "", true);
    chrome.storage.sync.set({ webhooks: Webhook.list });
    Webhook.render();
    Webhook.updateStyles();
};

actionToggle.onclick = ev => {
    chrome.storage.sync.set({ active: !status }, () => {
        status = !status;
        statusIcon.classList.toggle('on', status);
    });
};

chrome.storage.sync.get(['active', 'imageSize', 'username', 'webhooks'], result => {
    status = result.active;
    usernameInput.value = result.username;
    imageSizeSelect.value = result.imageSize;
    result.webhooks.forEach(webhook => {
        const { active, alias, url } = webhook;
        new Webhook(url, active, alias);
    });
    Webhook.render();
    if (!result.webhooks.length) {
        Webhook.updateStyles();
    }
    statusIcon.classList.toggle('on', status);
});

animate();
