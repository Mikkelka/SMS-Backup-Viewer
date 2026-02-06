const MOBILE_BREAKPOINT = 820;

const state = {
    conversations: new Map(),
    currentConversation: null,
    searchTerm: "",
    searchResults: [],
    totalMessages: 0
};

const htmlDecoder = document.createElement("textarea");

const dom = {
    xmlFile: null,
    searchInput: null,
    searchClear: null,
    conversationList: null,
    summaryPills: null,
    chatTitle: null,
    chatMessages: null,
    panelConversations: null,
    panelMessages: null,
    backButton: null,
    imageModal: null,
    imageModalImage: null,
    imageModalCaption: null,
    imageModalClose: null
};

document.addEventListener("DOMContentLoaded", init);

function init() {
    cacheDom();
    bindEvents();
    renderSummaryPills();
    showConversationsPanel();
    onResize();
}

function cacheDom() {
    dom.xmlFile = document.getElementById("xmlFile");
    dom.searchInput = document.getElementById("searchInput");
    dom.searchClear = document.getElementById("searchClear");
    dom.conversationList = document.getElementById("conversationList");
    dom.summaryPills = document.getElementById("summaryPills");
    dom.chatTitle = document.getElementById("chatTitle");
    dom.chatMessages = document.getElementById("chatMessages");
    dom.panelConversations = document.getElementById("panelConversations");
    dom.panelMessages = document.getElementById("panelMessages");
    dom.backButton = document.getElementById("backButton");
    dom.imageModal = document.getElementById("imageModal");
    dom.imageModalImage = document.getElementById("imageModalImage");
    dom.imageModalCaption = document.getElementById("imageModalCaption");
    dom.imageModalClose = document.getElementById("imageModalClose");
}

function bindEvents() {
    dom.xmlFile.addEventListener("change", onFileSelected);
    dom.searchInput.addEventListener("input", onSearchInput);
    dom.searchClear.addEventListener("click", clearSearch);
    dom.conversationList.addEventListener("click", onConversationListClick);
    dom.chatMessages.addEventListener("click", onMessagesClick);
    dom.backButton.addEventListener("click", showConversationsPanel);
    dom.imageModal.addEventListener("click", onModalBackdropClick);
    dom.imageModalClose.addEventListener("click", closeImageModal);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onGlobalKeydown);
}

async function onFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }

    dom.conversationList.innerHTML = "<div class=\"loading\">Indlæser samtaler...</div>";

    try {
        const xmlText = await file.text();
        parseXml(xmlText);
    } catch (error) {
        console.error(error);
        dom.conversationList.innerHTML = "<div class=\"loading\">Kunne ikke læse filen.</div>";
    }
}

function parseXml(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    if (xmlDoc.querySelector("parsererror")) {
        dom.conversationList.innerHTML = "<div class=\"loading\">XML-filen kunne ikke parses.</div>";
        return;
    }

    state.conversations.clear();
    state.currentConversation = null;
    state.searchResults = [];
    state.totalMessages = 0;

    const smsElements = xmlDoc.querySelectorAll("sms");
    const mmsElements = xmlDoc.querySelectorAll("mms");

    smsElements.forEach((sms, index) => {
        const address = normalizeAddress(sms.getAttribute("address"));
        const conversation = getOrCreateConversation(address, sms.getAttribute("contact_name"));
        const timestamp = normalizeTimestamp(sms.getAttribute("date"));
        const body = decodeHtmlEntities(sms.getAttribute("body") || "").trim() || "[Tom SMS]";

        conversation.messages.push({
            id: `sms-${timestamp}-${index}`,
            type: sms.getAttribute("type") === "1" ? "received" : "sent",
            body,
            timestamp,
            readableDate: sms.getAttribute("readable_date") || formatFallbackDate(timestamp),
            messageType: "SMS",
            hasMedia: false,
            mediaAttachments: []
        });

        state.totalMessages += 1;
    });

    mmsElements.forEach((mms, index) => {
        const address = normalizeAddress(mms.getAttribute("address"));
        const conversation = getOrCreateConversation(address, mms.getAttribute("contact_name"));
        const timestamp = normalizeTimestamp(mms.getAttribute("date"));
        const msgBox = mms.getAttribute("msg_box");
        const type = msgBox === "1" ? "received" : "sent";
        const mediaAttachments = [];
        const textParts = [];

        mms.querySelectorAll("part").forEach((part, partIndex) => {
            const contentType = part.getAttribute("ct") || "";
            const textValue = part.getAttribute("text") || "";
            const data = part.getAttribute("data") || "";
            const fileName =
                part.getAttribute("name") ||
                part.getAttribute("cl") ||
                `vedhæftning-${partIndex + 1}`;

            if (contentType.startsWith("text/") && textValue) {
                textParts.push(decodeHtmlEntities(textValue));
                return;
            }

            if (
                contentType.startsWith("image/") ||
                contentType.startsWith("video/") ||
                contentType.startsWith("audio/")
            ) {
                mediaAttachments.push({
                    type: contentType,
                    data,
                    fileName
                });
            }
        });

        const messageBody = buildMmsBody(textParts, mediaAttachments.length);

        conversation.messages.push({
            id: `mms-${timestamp}-${index}`,
            type,
            body: messageBody,
            timestamp,
            readableDate: mms.getAttribute("readable_date") || formatFallbackDate(timestamp),
            messageType: "MMS",
            hasMedia: mediaAttachments.length > 0,
            mediaAttachments
        });

        state.totalMessages += 1;
    });

    state.conversations.forEach((conversation) => {
        conversation.messages.sort((a, b) => a.timestamp - b.timestamp);
        const latest = conversation.messages[conversation.messages.length - 1];
        conversation.lastDate = latest ? latest.timestamp : 0;
        conversation.lastMessage = latest ? latest.body : "";
    });

    clearSearch();
    renderSummaryPills();

    const sortedConversations = getSortedConversations();
    if (!isMobile() && sortedConversations.length > 0) {
        showConversation(sortedConversations[0].address);
    } else {
        renderNoConversation("Vælg en samtale fra listen");
    }
}

function normalizeAddress(address) {
    if (!address || address.trim() === "") {
        return "Ukendt";
    }

    return address.trim();
}

function normalizeTimestamp(rawValue) {
    const numeric = Number.parseInt(rawValue || "0", 10);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return Date.now();
    }

    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function buildMmsBody(textParts, mediaCount) {
    const combinedText = textParts.join(" ").trim();
    if (combinedText) {
        return combinedText;
    }

    if (mediaCount > 0) {
        return "[MMS med mediefiler]";
    }

    return "[MMS besked]";
}

function getOrCreateConversation(address, rawContactName) {
    const contactName = pickDisplayName(rawContactName, address);

    if (!state.conversations.has(address)) {
        state.conversations.set(address, {
            address,
            name: contactName,
            messages: [],
            lastMessage: "",
            lastDate: 0
        });

        return state.conversations.get(address);
    }

    const existingConversation = state.conversations.get(address);
    if (
        isProbablyPhoneLabel(existingConversation.name, address) &&
        !isProbablyPhoneLabel(contactName, address)
    ) {
        existingConversation.name = contactName;
    }

    return existingConversation;
}

function pickDisplayName(rawContactName, address) {
    const contactName = (rawContactName || "").trim();
    if (!contactName || contactName === "null" || contactName === "(Unknown)") {
        return formatPhoneNumber(address);
    }

    return contactName;
}

function isProbablyPhoneLabel(name, address) {
    if (!name) {
        return true;
    }

    if (name === address) {
        return true;
    }

    return /^\+?[\d\s()-]+$/.test(name);
}

function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber === "Ukendt") {
        return "Ukendt";
    }

    const compact = String(phoneNumber).replace(/\s+/g, "");

    if (compact.startsWith("+45") && /^\+45\d{8}$/.test(compact)) {
        const local = compact.slice(3);
        return `+45 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)}`;
    }

    if (/^\d{8}$/.test(compact)) {
        return `+45 ${compact.slice(0, 2)} ${compact.slice(2, 4)} ${compact.slice(4, 6)} ${compact.slice(6, 8)}`;
    }

    return compact;
}

function decodeHtmlEntities(text) {
    htmlDecoder.innerHTML = text;
    return htmlDecoder.value;
}

function onSearchInput(event) {
    state.searchTerm = event.target.value.trim();
    toggleSearchClear(state.searchTerm.length > 0);

    if (!state.searchTerm) {
        state.searchResults = [];
        renderConversationList();
        return;
    }

    performSearch(state.searchTerm);
    renderSearchResults();
}

function clearSearch() {
    state.searchTerm = "";
    state.searchResults = [];
    dom.searchInput.value = "";
    toggleSearchClear(false);
    renderConversationList();
}

function toggleSearchClear(visible) {
    dom.searchClear.classList.toggle("visible", visible);
}

function performSearch(term) {
    const lowerTerm = term.toLocaleLowerCase();
    const results = [];

    state.conversations.forEach((conversation) => {
        const contactMatch = conversation.name.toLocaleLowerCase().includes(lowerTerm);

        conversation.messages.forEach((message) => {
            const messageMatch = message.body.toLocaleLowerCase().includes(lowerTerm);
            if (!contactMatch && !messageMatch) {
                return;
            }

            results.push({
                address: conversation.address,
                contactName: conversation.name,
                message
            });
        });
    });

    results.sort((a, b) => b.message.timestamp - a.message.timestamp);
    state.searchResults = results;
}

function getSortedConversations() {
    return [...state.conversations.values()].sort((a, b) => b.lastDate - a.lastDate);
}

function renderConversationList() {
    const conversations = getSortedConversations();

    if (conversations.length === 0) {
        dom.conversationList.innerHTML = "<div class=\"loading\">Ingen samtaler fundet</div>";
        return;
    }

    const fragment = document.createDocumentFragment();

    conversations.forEach((conversation) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "conversation-item";
        item.dataset.action = "open-conversation";
        item.dataset.address = conversation.address;

        if (conversation.address === state.currentConversation) {
            item.classList.add("active");
        }

        const top = document.createElement("div");
        top.className = "conversation-top";

        const name = document.createElement("div");
        name.className = "conversation-name";
        name.textContent = conversation.name;

        const count = document.createElement("span");
        count.className = "conversation-count";
        count.textContent = String(conversation.messages.length);

        top.append(name, count);

        const preview = document.createElement("div");
        preview.className = "conversation-preview";
        preview.textContent = conversation.lastMessage || "[Ingen tekst]";

        const date = document.createElement("div");
        date.className = "conversation-date";
        date.textContent = formatFallbackDate(conversation.lastDate);

        item.append(top, preview, date);
        fragment.appendChild(item);
    });

    dom.conversationList.innerHTML = "";
    dom.conversationList.appendChild(fragment);
}

function renderSearchResults() {
    dom.conversationList.innerHTML = "";

    if (state.searchResults.length === 0) {
        dom.conversationList.innerHTML = `<div class=\"loading\">Ingen resultater fundet for "${escapeHtml(state.searchTerm)}"</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    const count = document.createElement("div");
    count.className = "search-count";
    count.textContent = `${state.searchResults.length} beskeder fundet`;
    fragment.appendChild(count);

    state.searchResults.forEach((result, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "search-result-item";
        item.dataset.action = "open-search-result";
        item.dataset.index = String(index);

        const contact = document.createElement("div");
        contact.className = "search-result-contact";
        appendHighlightedText(contact, result.contactName, state.searchTerm);

        const message = document.createElement("div");
        message.className = "search-result-message";
        const preview = truncateText(result.message.body, 130);
        appendHighlightedText(message, preview, state.searchTerm);

        const date = document.createElement("div");
        date.className = "search-result-date";
        date.textContent = result.message.readableDate;

        item.append(contact, message, date);
        fragment.appendChild(item);
    });

    dom.conversationList.appendChild(fragment);
}

function onConversationListClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) {
        return;
    }

    if (target.dataset.action === "open-search-result") {
        const index = Number.parseInt(target.dataset.index || "-1", 10);
        const result = state.searchResults[index];
        if (result) {
            showConversation(result.address, result.message.timestamp);
        }

        return;
    }

    if (target.dataset.action === "open-conversation") {
        showConversation(target.dataset.address || "");
    }
}

function showConversation(address, highlightTimestamp = null) {
    const conversation = state.conversations.get(address);
    if (!conversation) {
        return;
    }

    state.currentConversation = address;
    dom.chatTitle.textContent = conversation.name;

    if (!state.searchTerm) {
        renderConversationList();
    }

    renderMessages(conversation, highlightTimestamp);

    if (isMobile()) {
        showMessagesPanel();
    }
}

function renderMessages(conversation, highlightTimestamp) {
    dom.chatMessages.innerHTML = "";

    if (!conversation.messages.length) {
        renderNoConversation("Ingen beskeder i denne samtale");
        return;
    }

    const fragment = document.createDocumentFragment();
    let targetElement = null;

    conversation.messages.forEach((message) => {
        const wrapper = document.createElement("article");
        wrapper.className = `message ${message.type}${message.messageType === "MMS" ? " mms" : ""}`;
        wrapper.dataset.timestamp = String(message.timestamp);

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        const time = document.createElement("div");
        time.className = "message-time";
        time.textContent = message.readableDate;

        if (message.messageType === "MMS") {
            const typeBadge = document.createElement("span");
            typeBadge.className = "message-type";
            typeBadge.textContent = message.hasMedia ? "MMS media" : "MMS";
            time.appendChild(typeBadge);
        }

        const body = document.createElement("div");
        body.className = "message-body";

        if (state.searchTerm) {
            appendHighlightedText(body, message.body, state.searchTerm);
        } else {
            body.textContent = message.body;
        }

        bubble.append(time, body);

        if (message.mediaAttachments && message.mediaAttachments.length > 0) {
            bubble.appendChild(createMediaAttachments(message.mediaAttachments));
        }

        wrapper.appendChild(bubble);

        if (highlightTimestamp && message.timestamp === highlightTimestamp && !targetElement) {
            wrapper.classList.add("message-target");
            targetElement = wrapper;
        }

        fragment.appendChild(wrapper);
    });

    dom.chatMessages.appendChild(fragment);

    if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
            targetElement.classList.remove("message-target");
        }, 2200);
    } else {
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }
}

function createMediaAttachments(attachments) {
    const container = document.createElement("div");
    container.className = "media-attachments";

    attachments.forEach((attachment) => {
        if (!attachment.data) {
            return;
        }

        const item = document.createElement("div");
        item.className = "media-item";

        const source = `data:${attachment.type};base64,${attachment.data}`;

        if (attachment.type.startsWith("image/")) {
            const image = document.createElement("img");
            image.src = source;
            image.alt = attachment.fileName || "MMS-billede";
            image.dataset.imageSrc = source;
            image.dataset.fileName = attachment.fileName || "MMS-billede";
            item.appendChild(image);
        } else if (attachment.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.controls = true;

            const videoSource = document.createElement("source");
            videoSource.src = source;
            videoSource.type = attachment.type;
            video.appendChild(videoSource);

            item.appendChild(video);
        } else if (attachment.type.startsWith("audio/")) {
            const audio = document.createElement("audio");
            audio.controls = true;

            const audioSource = document.createElement("source");
            audioSource.src = source;
            audioSource.type = attachment.type;
            audio.appendChild(audioSource);

            item.appendChild(audio);
        }

        const fileName = document.createElement("div");
        fileName.className = "media-filename";
        fileName.textContent = attachment.fileName || "Vedhæftning";

        item.appendChild(fileName);
        container.appendChild(item);
    });

    return container;
}

function onMessagesClick(event) {
    const image = event.target.closest("img[data-image-src]");
    if (!image) {
        return;
    }

    openImageModal(image.dataset.imageSrc, image.dataset.fileName || "MMS-billede");
}

function openImageModal(source, fileName) {
    dom.imageModalImage.src = source;
    dom.imageModalCaption.textContent = fileName;
    dom.imageModal.hidden = false;
}

function closeImageModal() {
    dom.imageModal.hidden = true;
    dom.imageModalImage.src = "";
    dom.imageModalCaption.textContent = "";
}

function onModalBackdropClick(event) {
    if (event.target === dom.imageModal) {
        closeImageModal();
    }
}

function onGlobalKeydown(event) {
    if (event.key === "Escape" && !dom.imageModal.hidden) {
        closeImageModal();
    }
}

function renderNoConversation(text) {
    dom.chatTitle.textContent = "Vælg en samtale";
    dom.chatMessages.innerHTML = `<div class=\"no-conversation\">${escapeHtml(text)}</div>`;
}

function showConversationsPanel() {
    dom.panelConversations.classList.add("active");
    dom.panelMessages.classList.remove("active");
}

function showMessagesPanel() {
    dom.panelConversations.classList.remove("active");
    dom.panelMessages.classList.add("active");
}

function onResize() {
    if (!isMobile()) {
        dom.panelConversations.classList.add("active");
        dom.panelMessages.classList.add("active");
        return;
    }

    if (state.currentConversation) {
        showMessagesPanel();
    } else {
        showConversationsPanel();
    }
}

function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

function renderSummaryPills() {
    dom.summaryPills.innerHTML = "";

    const conversationPill = createSummaryPill(`Samtaler ${state.conversations.size}`);
    const messagePill = createSummaryPill(`Beskeder ${state.totalMessages}`);

    dom.summaryPills.append(conversationPill, messagePill);
}

function createSummaryPill(text) {
    const pill = document.createElement("span");
    pill.className = "summary-pill";
    pill.textContent = text;
    return pill;
}

function appendHighlightedText(element, text, searchTerm) {
    const source = text || "";
    const term = searchTerm || "";

    if (!term) {
        element.textContent = source;
        return;
    }

    const lowerSource = source.toLocaleLowerCase();
    const lowerTerm = term.toLocaleLowerCase();
    let cursor = 0;

    while (cursor < source.length) {
        const foundAt = lowerSource.indexOf(lowerTerm, cursor);

        if (foundAt === -1) {
            element.appendChild(document.createTextNode(source.slice(cursor)));
            break;
        }

        if (foundAt > cursor) {
            element.appendChild(document.createTextNode(source.slice(cursor, foundAt)));
        }

        const mark = document.createElement("mark");
        mark.className = "search-highlight";
        mark.textContent = source.slice(foundAt, foundAt + lowerTerm.length);
        element.appendChild(mark);

        cursor = foundAt + lowerTerm.length;
    }
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text || "";
    }

    return `${text.slice(0, maxLength - 1)}...`;
}

function formatFallbackDate(timestamp) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Ukendt dato";
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return "Ukendt dato";
    }

    return date.toLocaleString("da-DK");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
