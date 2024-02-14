const axios = require('axios');

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    if (body.event === 'message_created') {
        await handleMessageCreated(event);
    }
    if (body.event === 'conversation_status_changed') {
        await handleConversationStatusChanged(event);
    }
    if (body.event === 'automation_event.conversation_updated') {
        await handleAutomationRule();
    }

    async function handleAutomationRule(event) {
        const body = JSON.parse(event.body);
        let isOpenByCustomer = body.event === "automation_event.conversation_updated" && body.status === "open"
        if (isOpenByCustomer) {
            console.log("Opened a conversation!");
            await sendMessage(body);
        }
    }

    async function handleMessageCreated(event) {
        const body = JSON.parse(event.body);
        console.log("handling message created: " + body);

        console.log(body);
        let bodybuilding = body.content === 'I want to talk about bodybuilding';
        if (bodybuilding) {
            await step2(body.conversation.id);
        }
    }

    async function handleConversationStatusChanged(event) {
        const body = JSON.parse(event.body);
        console.log(body);
        let isOpenByCustomer = body.event === 'conversation_status_changed' && body.status === "open" && body.messages[0].sender_type === 'Contact' && body.meta.sender.type === 'contact';
        if (isOpenByCustomer) {
            if (body.messages[0].conversation_id !== 116) return;
            await sendMessage(body.messages[0].conversation_id, body.meta.sender.name);
        }
    }

    async function step2(conversationId) {
        try {
            const requestBody = {
                "content": "Ok, we can talk about bodybuilding. What do you want to know?",
            };

            const apiUrl = 'https://app.chatwoot.com/api/v1/accounts/accountId/conversations/' + conversationId + '/messages';
            const headers = chatwootHeaders();
            const response = await axios.post(apiUrl, requestBody, {headers});
            console.log('Resposta da API:', response.data);
        } catch (erro) {
            console.error('Erro ao fazer requisição:', erro);
        }
    }

    async function sendMessage(conversationId, name) {
        try {
            const requestBody = {
                "content": "Hey " + retrieveFirstName(name) + ", how can I help you today?",
                "content_type": "input_select",
                "content_attributes": {
                    "items": [
                        { "title": "Talk about bodybuilding", "value": "I want to talk about bodybuilding" },
                        { "title": "Talk about diet", "value": "I want to talk about diet" }
                    ]
                }
            }

            const apiUrl = 'https://app.chatwoot.com/api/v1/accounts/91698/conversations/' + conversationId + '/messages';
            const headers = chatwootHeaders();
            const response = await axios.post(apiUrl, requestBody, { headers });
            console.log('Resposta da API:', response.data);
        } catch (erro) {
            console.error('Erro ao fazer requisição:', erro);
        }
    }

    function retrieveFirstName(fullname) {
        const parts = fullname.split(" ");
        const firstname = parts[0];

        if (isValidPartName(firstname)) return firstname;

        fullname = fullname
            .replace("(D)", "")
            .replace("(TD)", "")
            .replace("(T)", "");

        return fullname;
    }

    function isValidPartName(partName) {
        return partName !== null && partName.trim() !== "" && partName.length >= 2;
    }

    function chatwootHeaders() {
        return {
            'api_access_token': 'secret',
            'Content-Type': 'application/json'
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify('OK')
    };
};
