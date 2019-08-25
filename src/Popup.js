/*global chrome*/
import React from 'react';
import logo from './images/yeet32.png';
/**
 * VARIABLES
 */

const ALIASES = [
    "Name me please",
    "I deserve a name",
    "Give me a name",
    "Names are overrated",
    "Look mom, no name",
    "Insert cool name here",
    "Unnamed dank webhook",
    "I am nameless",
];
const MAX_WEBHOOKS = 10;
const VALID_KEYS = ['night', 'status', 'username', 'webhooks'];

const manifest = chrome.runtime.getManifest();
// Keys
let shift = false;

window.onkeydown = ev => {
    if (ev.key === 'Shift') {
        shift = true;
    }
};
window.onkeyup = ev => {
    if (ev.key === 'Shift') {
        shift = false;
    }
};

/**
 * CLASSES
 */
class Popup extends React.Component {

    /**
     * Contains the entire popup component.
     * Yeah, maybe I should split it into child components, but since
     * the edition/update/deletion of a webhook is handled in here anyway,
     * there wasn't much left to give to a `Webhook` component.
     * But it's working and I'm a React newbie so idc.
     *
     * @override
     * @param  {Object} props React component properties
     */
    constructor(props) {
        super();
        this.state = {
            edited: -1,
            night: !!props.night,
            status: !!props.status,
            username: props.username || "",
            webhooks: props.webhooks || [],
        };

        // Pre-bind everything in here
        this.onClickAdd = this.onClickAdd.bind(this);
        this.onClickClean = this.onClickClean.bind(this);
        this.onChangeUsername = this.onChangeUsername.bind(this);
        this.onClickStatus = this.onClickStatus.bind(this);
        this.onClickNight = this.onClickNight.bind(this);
        this.onKeyInput = this.onKeyInput.bind(this);
    }

    nextInput(node) {
        const texts = [...document.getElementsByClassName('input')].filter(i => i.type === 'text');
        let index = texts.indexOf(node) + 1;
        if (index >= texts.length) {
            index = 0;
        }
        node.blur();
        if (node !== texts[index]) {
            texts[index].focus();
        }
    }

    prevInput(node) {
        const texts = [...document.getElementsByClassName('input')].filter(i => i.type === 'text');
        let index = texts.indexOf(node) - 1;
        if (index < 0) {
            index = texts.length - 1;
        }
        node.blur();
        if (node !== texts[index]) {
            texts[index].focus();
        }
    }

    /**
     * Filters bad words from an input string.
     * 
     * @param  {String} value
     * @return {String}
     */
    profanityFilter(value) {
        return value
            .replace(/fuck/gi, "duck")
            .replace(/bitch/gi, "beach")
            .replace(/cunt/gi, "kwak");
    }

    /**
     * Gets a random alias for an un-aliased webhook.
     * 
     * @return {String}
     */
    randomAlias() {
        return ALIASES[Math.floor(Math.random() * ALIASES.length)];
    }
    

    /**
     * Gives all the webhooks their index in the list.
     * 
     * @param  {Webhooks[]} webhooks
     * @return {Webhook[]}
     */
    reorder(webhooks) {
        webhooks.forEach((w, i) => { w.order = i; });
        return webhooks;
    }

    /**
     * Helper function to automatically set the state AND the storage.
     * Callback is executed once both operations are completed.
     * 
     * @param {Object}   data     key:value object of data to update
     */
    setStateAndUpdate(data) {
        this.setState(data, () => {
            const invalidKeys = Object.keys(data).filter(key => !VALID_KEYS.includes(key));
            invalidKeys.forEach(key => { delete data[key]; });
            if (Object.keys(data).length) {
                chrome.storage.sync.set(data);
            }
        });
    }

    /**
     * Handles the changes on the `active` property of a webhook.
     * 
     * @param  {Object} webhook
     * @param  {Event} ev
     */
    onChangeActive(webhook, ev) {
        webhook.active = ev.target.checked;
        this.setStateAndUpdate({ webhooks: this.state.webhooks });
    }

    /**
     * Handles the changes on the `alias` property of a webhook.
     * Since react doesn't implement an `onInput` handler, the value
     * has to be manually checked on each text input after an `onBlur` event.
     * 
     * @param  {Object} webhook
     * @param  {Event} ev
     */
    onChangeAlias(webhook, ev) {
        const newValue = this.profanityFilter(ev.target.value);
        if (newValue !== this.state.webhooks[webhook.order].alias) {
            webhook.alias = newValue;
            this.setStateAndUpdate({ webhooks: this.state.webhooks });
        }
    }

    /**
     * Handles the changes on the `url` property of a webhook.
     * @see onChangeAlias for details.
     * 
     * @param  {Object} webhook
     * @param  {Event} ev
     */
    onChangeUrl(webhook, ev) {
        const newValue = ev.target.value;
        if (newValue !== this.state.webhooks[webhook.order].url) {
            webhook.url = newValue;
            this.setStateAndUpdate({ webhooks: this.state.webhooks });
        }
    }

    /**
     * Handles the changes on the `username` global property.
     * @see onChangeAlias for details.
     * 
     * @param  {Event} ev
     */
    onChangeUsername(ev) {
        const username = this.profanityFilter(ev.target.value);
        if (username !== this.state.username) {
            this.setStateAndUpdate({ username: username });
        }
    }

    /**
     * Adds a new webhook to the list
     * 
     * @param  {Event} ev
     */
    onClickAdd(ev) {
        const webhooks = this.state.webhooks;
        const order = webhooks.length;
        webhooks.push({
            active: true,
            alias: "",
            order: order,
            url: "",
        });
        this.setStateAndUpdate({ edited: order, webhooks: webhooks });
    }

    /**
     * Removes all empty webhooks (no alias and no url).
     * 
     * @param  {Event} ev
     */
    onClickClean(ev) {
        const webhooks = this.state.webhooks.filter(w => w.alias.length || w.url.length);
        this.setStateAndUpdate({ edited: -1, webhooks: this.reorder(webhooks) });
    }

    /**
     * Toggles the edition of a given webhook.
     * If it is already edited, the edition index goes to -1 (no webhook being edited).
     * 
     * @param  {Object} webhook
     */
    onClickEdit(webhook) {
        this.setState({ edited: webhook.order === this.state.edited ? -1 : webhook.order });
    }

    /**
     * Spin it !
     * 
     * @param  {Event} ev
     */
    onClickLogo(ev) {
        const logo = ev.target;
        if (!logo.classList.contains('sick-spin')) {
            logo.classList.add('sick-spin');
            setTimeout(() => logo.classList.remove('sick-spin'), 250);
        }
    }

    /**
     * Handles the changes on the `night` global property.
     * 
     * @param  {Object} webhook
     * @param  {Event} ev
     */
    onClickNight(ev) {
        this.setStateAndUpdate({ night: !this.state.night });
    }

    /**
     * Removes a given webhook from the list and updates the state.
     * 
     * @param  {Object} webhook
     */
    onClickRemove(webhook) {
        const webhooks = this.state.webhooks;
        webhooks.splice(webhook.order, 1);
        this.setStateAndUpdate({ edited: -1, webhooks: this.reorder(webhooks) });
    }

    /**
     * Handles the changes on the `status` global property.
     * 
     * @param  {Event} ev
     */
    onClickStatus(ev) {
        this.setStateAndUpdate({ status: !this.state.status });
    }

    /**
     * Handles generic keydown behaviour on inputs.
     * 
     * @param  {Event} ev
     */
    onKeyInput(ev) {
        switch (ev.key) {
            case 'Enter':
                shift ? this.prevInput(ev.target) : this.nextInput(ev.target);
                break;
            case 'Escape':
                ev.preventDefault();
                document.activeElement.blur();
                break;
            default:
                break;
        }
    }

    /**
     * Handles the re-ordering feature of the webhooks list.
     * 
     * @param  {Object} webhook  Webhook being reordered
     * @param  {Event} ev        Mouse event
     */
    onStartDrag(webhook, ev) {
        if (ev.button !== 0 ||
            !ev.target.closest('td').classList.contains('td-inputs') ||
            webhook.order === this.state.edited) {
            return;
        }
        ev.preventDefault();
        const tr = ev.target.closest('tr');
        const tbody = tr.parentNode;
        const initialIndex = webhook.order;
        let trRect = tr.getBoundingClientRect();
        let finalIndex = webhook.order;
        const tag = document.createElement('div');
        tag.classList = 'tag';
        tag.innerHTML = webhook.alias || this.randomAlias();
        tag.style.left = `${ev.clientX - trRect.width / 2}px`;
        tag.style.top = `${ev.clientY - trRect.height / 2}px`;
        document.getElementById('popup').append(tag);
        tr.classList.add('dragging');
        window.onmousemove = ev => {
            tag.style.left = `${ev.clientX - trRect.width / 2}px`;
            tag.style.top = `${ev.clientY - trRect.height / 2}px`;

            if (ev.clientY < trRect.y) {
                finalIndex --;
            } else if (ev.clientY > trRect.y + trRect.height) {
                finalIndex ++;
            } else {
                return;
            }
            finalIndex = Math.max(Math.min(finalIndex, tbody.children.length - 1), 0);
            const target = tbody.getElementsByClassName('target')[0];
            if (target) {
                target.classList.remove('target');
            }
            tbody.children[finalIndex].classList.add('target');
            trRect = tbody.children[finalIndex].getBoundingClientRect();
        };
        window.onmouseup = ev => {
            document.getElementById('popup').removeChild(tag);
            window.onmousemove = null;
            window.onmouseup = null;
            const target = tbody.getElementsByClassName('target')[0];
            if (target) {
                target.classList.remove('target');
            }
            tr.classList.remove('dragging');
            if (finalIndex !== webhook.order) {
                const webhooks = this.state.webhooks.slice(0);
                webhooks.splice(finalIndex, 0, webhooks.splice(initialIndex, 1)[0]);
                this.setStateAndUpdate({ edited: -1, webhooks: this.reorder(webhooks) });
            }
        };
    }

    /**
     * Main rendering of the component.
     * 
     * @override
     */
    render() {
        return (
            <div id="popup" className={`${this.state.night && 'night'} ${this.state.status && 'rgb'}`}>
                <header className="header">
                    <img id="img-logo" src={logo} alt="Yeet" onClick={this.onClickLogo}/>
                    <h1 id="title-app" className="rgb">{manifest.name}</h1>
                    <label id="label-version">v{manifest.version}</label>
                </header>
                <main className="content">
                    <div className="section">
                        <h3 id="title-username" className="section-title">Username</h3>
                        <input
                            id="input-username"
                            className="input rgb"
                            maxLength="32"
                            onBlur={this.onChangeUsername}
                            onKeyDown={this.onKeyInput}
                            placeholder="Username ..."
                            defaultValue={this.state.username}/>
                    </div>
                    <div className="section">
                        <h3 className="section-title">Webhooks ({this.state.webhooks.length}/{MAX_WEBHOOKS})</h3>
                        <table>
                            <tbody>
                                {this.state.webhooks.map(webhook => {
                                    const { active, alias, order, url } = webhook;
                                    const editing = webhook.order === this.state.edited;
                                    return (
                                        <tr key={order} className={`webhook ${editing && 'editing'} ${!active && 'inactive'}`} onMouseDown={this.onStartDrag.bind(this, webhook)}>
                                            <td className="td-active">
                                                <label className="cb-container" title="activate/deactivate">
                                                    <input className="webhook-active" checked={active} onChange={this.onChangeActive.bind(this, webhook)} type="checkbox"/>
                                                    <span className="cb-checkmark"></span>
                                                </label>
                                            </td>
                                            <td className="td-inputs">
                                                {editing ? (
                                                        <>
                                                            <input
                                                                className={`input ${active && 'rgb'}`}
                                                                maxLength="32"
                                                                onBlur={this.onChangeAlias.bind(this, webhook)}
                                                                onKeyDown={this.onKeyInput}
                                                                placeholder="Alias ..."
                                                                defaultValue={alias}
                                                                title={alias}/>
                                                            <input
                                                                className={`input ${active && 'rgb'}`}
                                                                onBlur={this.onChangeUrl.bind(this, webhook)}
                                                                onKeyDown={this.onKeyInput}
                                                                placeholder="URL ..."
                                                                defaultValue={url}
                                                                title={url}/>
                                                        </>
                                                    ) : (
                                                        <label className={`alias ${active && alias.length && 'rgb'}`} title={alias}>{alias.length ? alias : this.randomAlias()}</label>
                                                    )}
                                            </td>
                                            <td className="td-controls">
                                                <button className="btn" onClick={this.onClickEdit.bind(this, webhook)} title="Edit webhook">
                                                    <i className={`icon-edit fas fa-pen ${!editing && active && 'rgb'}`}></i>
                                                </button>
                                                {editing && <button className="btn" onClick={this.onClickRemove.bind(this, webhook)} title="Delete webhook">
                                                    <i className="icon-remove fas fa-trash"></i>
                                                </button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!this.state.webhooks.length && <div><label id="label-empty">You have no webhooks !</label></div>}
                        {this.state.webhooks.length < MAX_WEBHOOKS &&
                            <button id="button-add" className="list-btn rgb" onClick={this.onClickAdd} title="Add a new webhook">Add <i className="fas fa-plus rgb"></i></button>}
                        {this.state.webhooks.find(w => !w.alias.length && !w.url.length) &&
                            <button id="button-clean" className="list-btn rgb" onClick={this.onClickClean} title="Remove all empty webhooks">Clean <i className="fas fa-recycle rgb"></i></button>}
                    </div>
                </main>
                <footer className="footer">
                    <button id="button-status" className="control" onClick={this.onClickStatus} title={`Turn ${this.state.status ? "off" : "on"}`}>
                        <i className={`rgb fas fa-toggle-${this.state.status ? 'on' : 'off'}`}></i>
                    </button>
                    <button id="button-night" className="control" onClick={this.onClickNight} title={this.state.night ? "Day mode" : "Night mode"}>
                        <i id="icon-night" className={this.state.night ? "fas fa-sun rgb" : "fas fa-moon rgb"}></i>
                    </button>
                    <a id="link-github" className="control" href="https://github.com/Arcasias/Dank-share" target="_blank" rel="noopener noreferrer" title="Source code">
                        <i id="icon-github" className="fab fa-github rgb"></i>
                    </a>
                </footer>
            </div>
        );
    }

}

export default Popup;
