let conversations = {};
let currentConversation = null;
let searchTerm = '';
let searchResults = [];


document.getElementById('xmlFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            parseXML(e.target.result);
        };
        reader.readAsText(file);
    }
});

function parseXML(xmlString) {
    document.getElementById('conversationList').innerHTML = '<div class="loading">Indlæser samtaler...</div>';
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const smsElements = xmlDoc.querySelectorAll('sms');
    
    conversations = {};
    
    smsElements.forEach(sms => {
        const address = sms.getAttribute('address');
        let contactName = sms.getAttribute('contact_name');
        
        // Check for invalid contact names and use address instead
        if (!contactName || contactName === 'null' || contactName === '(Unknown)' || contactName.trim() === '') {
            contactName = formatPhoneNumber(address);
        }
        
        const type = sms.getAttribute('type'); // 1 = received, 2 = sent
        const body = sms.getAttribute('body');
        const date = parseInt(sms.getAttribute('date'));
        const readableDate = sms.getAttribute('readable_date');
        
        if (!conversations[address]) {
            conversations[address] = {
                name: contactName,
                messages: [],
                lastMessage: '',
                lastDate: 0
            };
        } else {
            // If we already have this conversation but now have a better name, update it
            const currentName = conversations[address].name;
            const isCurrentNamePhoneNumber = currentName === address || currentName.includes('+') || /^\d/.test(currentName);
            const isNewNameReal = contactName !== address && !contactName.includes('+') && !/^\d/.test(contactName);
            
            if (isCurrentNamePhoneNumber && isNewNameReal) {
                conversations[address].name = contactName;
            }
        }
        
        const message = {
            type: type === '1' ? 'received' : 'sent',
            body: decodeHTMLEntities(body),
            timestamp: date,
            readableDate: readableDate
        };
        
        conversations[address].messages.push(message);
        
        if (date > conversations[address].lastDate) {
            conversations[address].lastDate = date;
            conversations[address].lastMessage = message.body;
        }
    });
    
    // Sort messages within each conversation by timestamp
    Object.values(conversations).forEach(conv => {
        conv.messages.sort((a, b) => a.timestamp - b.timestamp);
    });
    
    displayConversationList();
    setupSearch();
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    searchInput.addEventListener('input', function(e) {
        searchTerm = e.target.value.trim();
        
        if (searchTerm.length > 0) {
            searchClear.style.display = 'block';
            performSearch(searchTerm);
        } else {
            searchClear.style.display = 'none';
            displayConversationList();
        }
    });
    
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchTerm = '';
        searchClear.style.display = 'none';
        displayConversationList();
    });
}

function performSearch(term) {
    const regex = new RegExp(term, 'gi');
    searchResults = [];
    
    Object.entries(conversations).forEach(([address, conv]) => {
        // Search in contact name
        if (regex.test(conv.name)) {
            conv.messages.forEach(message => {
                searchResults.push({
                    address: address,
                    contactName: conv.name,
                    message: message,
                    matchType: 'contact'
                });
            });
        }
        
        // Search in message content
        conv.messages.forEach(message => {
            if (regex.test(message.body)) {
                searchResults.push({
                    address: address,
                    contactName: conv.name,
                    message: message,
                    matchType: 'message'
                });
            }
        });
    });
    
    // Sort by timestamp (newest first)
    searchResults.sort((a, b) => b.message.timestamp - a.message.timestamp);
    
    displaySearchResults();
}

function displaySearchResults() {
    const conversationList = document.getElementById('conversationList');
    
    if (searchResults.length === 0) {
        conversationList.innerHTML = `<div class="loading">Ingen resultater fundet for "${searchTerm}"</div>`;
        return;
    }
    
    let html = `<div class="search-count">${searchResults.length} beskeder fundet</div>`;
    
    searchResults.forEach((result, index) => {
        const messagePreview = result.message.body.length > 100 
            ? result.message.body.substring(0, 100) + '...' 
            : result.message.body;
        
        html += `
            <div class="search-result-item" onclick="showSearchResult(${index})">
                <div class="search-result-contact">${highlightText(result.contactName, searchTerm)}</div>
                <div class="search-result-message">${highlightText(messagePreview, searchTerm)}</div>
                <div class="search-result-date">${result.message.readableDate}</div>
            </div>
        `;
    });
    
    conversationList.innerHTML = html;
}

function highlightText(text, term) {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return 'Unknown';
    
    // Remove any whitespace
    let formatted = phoneNumber.toString().replace(/\s/g, '');
    
    // If it starts with +45 (Denmark), format nicely
    if (formatted.startsWith('+45')) {
        formatted = formatted.substring(3);
        if (formatted.length === 8) {
            return `+45 ${formatted.substring(0, 2)} ${formatted.substring(2, 4)} ${formatted.substring(4, 6)} ${formatted.substring(6, 8)}`;
        }
    }
    
    // If it's 8 digits, assume Danish number and add +45
    if (formatted.length === 8 && /^\d+$/.test(formatted)) {
        return `+45 ${formatted.substring(0, 2)} ${formatted.substring(2, 4)} ${formatted.substring(4, 6)} ${formatted.substring(6, 8)}`;
    }
    
    // For other formats, return as is but clean
    return formatted;
}

function showSearchResult(index) {
    const result = searchResults[index];
    showConversation(result.address, result.message.timestamp);
}

function displayConversationList() {
    const conversationList = document.getElementById('conversationList');
    
    // Sort conversations by last message date
    const sortedConversations = Object.entries(conversations)
        .sort(([,a], [,b]) => b.lastDate - a.lastDate);
    
    if (sortedConversations.length === 0) {
        conversationList.innerHTML = '<div class="loading">Ingen samtaler fundet</div>';
        return;
    }
    
    conversationList.innerHTML = '';
    
    sortedConversations.forEach(([address, conv]) => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.onclick = () => showConversation(address);
        
        item.innerHTML = `
            <div class="conversation-name">${conv.name} <span class="conversation-count">${conv.messages.length}</span></div>
            <div class="conversation-preview">${conv.lastMessage}</div>
        `;
        
        conversationList.appendChild(item);
    });
}

function showConversation(address, highlightTimestamp = null) {
    // Update active conversation only if not from search
    if (!highlightTimestamp) {
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        if (event && event.target) {
            event.target.closest('.conversation-item').classList.add('active');
        }
    }
    
    currentConversation = address;
    const conv = conversations[address];
    
    document.getElementById('chatTitle').textContent = conv.name;
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    let targetMessageElement = null;
    
    conv.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        
        // Highlight search term in message body if searching
        let messageBody = message.body;
        if (searchTerm && searchTerm.length > 0) {
            messageBody = highlightText(message.body, searchTerm);
        }
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <div class="message-time">${message.readableDate}</div>
                ${messageBody}
            </div>
        `;
        
        // Mark message to scroll to if it matches the timestamp
        if (highlightTimestamp && message.timestamp === highlightTimestamp) {
            targetMessageElement = messageDiv;
            messageDiv.style.backgroundColor = 'rgba(10, 132, 255, 0.2)';
            messageDiv.style.borderRadius = '10px';
            messageDiv.style.padding = '5px';
            messageDiv.style.margin = '5px 0';
        }
        
        chatMessages.appendChild(messageDiv);
    });
    
    // Scroll to specific message or bottom
    if (targetMessageElement) {
        targetMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            targetMessageElement.style.backgroundColor = '';
            targetMessageElement.style.borderRadius = '';
            targetMessageElement.style.padding = '';
            targetMessageElement.style.margin = '';
        }, 3000);
    } else {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Simple mobile navigation
function showConversations() {
    document.getElementById('panelConversations').classList.add('active');
    document.getElementById('panelMessages').classList.remove('active');
}

function showMessages() {
    document.getElementById('panelConversations').classList.remove('active');
    document.getElementById('panelMessages').classList.add('active');
}

// Override showConversation to switch to messages on mobile
const originalShowConversation = showConversation;
showConversation = function(address, highlightTimestamp = null) {
    originalShowConversation.call(this, address, highlightTimestamp);
    
    // Switch to messages view on mobile when conversation is selected
    if (window.innerWidth <= 768) {
        showMessages();
    }
};


// Initialize - show conversations by default
document.addEventListener('DOMContentLoaded', function() {
    showConversations();
});