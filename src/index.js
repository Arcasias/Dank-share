/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom';
import Popup from './Popup';
import './popup.css';

chrome.storage.sync.get(['night', 'status', 'username', 'webhooks'], result => {
    const { night, status, username, webhooks } = result;
    ReactDOM.render(
        <Popup
            night={night}
            status={status}
            username={username}
            webhooks={webhooks}/>,
        document.getElementById('root')
    );
});
