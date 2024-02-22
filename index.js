const axios = require('axios');

const SUBJECT = Object.freeze({
    TREINADOR: "Treinador",
    NUTRICIONISTA: "Nutricionista",
    SUPORTE: "Suporte",

    getByValue: function(value) {
        for (let key in this) {
            if (this[key] === value) {
                return key;
            }
        }
        return null;
    }
});

const PLAN_TYPE = Object.freeze({
    DIET: 'Dieta',
    BODYBUILDING: "Treino",
    BODYBUILDING_DIET: "Treino e Dieta",

    getByValue: function(value) {
        for (let key in this) {
            if (this[key] === value) {
                return key;
            }
        }
        return null;
    }
});

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    if (body.event === 'message_created') {
        await handleMessageCreated(event);
    }
    if (body.event === 'conversation_status_changed') {
        await handleWebhook(event);
    }
    if (body.event === 'automation_event.conversation_updated') {
        // unused
        handleAutomationRule();
    }

    async function handleAutomationRule(event) {
        const body = JSON.parse(event.body);
        console.log(body);
        let isOpenByCustomer = body.event === "automation_event.conversation_updated" && body.status === "open"
        if (isOpenByCustomer) {
            console.log("Cliente abriu uma conversa!");
            await sendMessage(body);
        }
    }

    async function handleMessageCreated(event) {
        const body = JSON.parse(event.body);
        console.log("handling message created: " + body);

        let subject = SUBJECT.getByValue(body.content);
        let teamId = getTeamId(subject);
        if (subject && teamId) {
            await step2(body.conversation.id);
            await assignConversation(body.conversation.id, teamId);
        }
    }

    async function handleWebhook(event) {
        const body = JSON.parse(event.body);
        console.log(body);
        let isOpenByCustomer = body.event === 'conversation_status_changed' && body.status === "open" && body.messages[0].sender_type === 'Contact' && body.meta.sender.type === 'contact';
        if (isOpenByCustomer) {
            let unassigned = body.meta.assignee == null || body.meta.team == null;
            if (unassigned) {
                const planType = PLAN_TYPE.getByValue(body.meta.sender.custom_attributes.tipo_de_plano);
                await sendMessage(body.messages[0].conversation_id, body.meta.sender.name, planType);
            } else {
                console.log("Conversa já tem profissional atribuido");
            }
        }
    }

    async function step2(conversationId) {
        try {
            const requestBody = {
                "content": "Perfeito! Você será redirecionado para ao responsável pelo seu acompanhamento. Você pode enviar sua dúvida aqui e em breve você será atendido"
            };

            const apiUrl = getChatwootBaseUrl() + '/conversations/' + conversationId + '/messages';
            const headers = chatwootHeaders();
            const response = await axios.post(apiUrl, requestBody, {headers});
            console.log('Resposta da API:', response.data);
        } catch (erro) {
            console.error('Erro ao fazer requisição:', erro);
        }
    }

    async function sendMessage(conversationId, name, planType) {
        try {
            const requestBody = {
                "content": "Olá " + retrieveFirstName(name) + ". Para agilizar o seu atendimento, com quem você deseja falar?",
                "content_type": "input_select",
                "content_attributes": {
                    "items": getButtonOptions(planType)
                }
            }

            const apiUrl = getChatwootBaseUrl() + '/conversations/' + conversationId + '/messages';
            const headers = chatwootHeaders();
            const response = await axios.post(apiUrl, requestBody, { headers });
            console.log('Resposta da API:', response.data);
        } catch (erro) {
            console.error('Erro ao fazer requisição:', erro);
        }
    }

    async function assignConversation(conversationId, teamId) {
        try {
            const requestBody = {
                "team_id": teamId
            };

            const apiUrl = getChatwootBaseUrl() + '/conversations/' + conversationId + '/assignments';
            const headers = chatwootHeaders();
            const response = await axios.post(apiUrl, requestBody, {headers});
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
        if (partName === null) return false;
        if (partName.trim() === "") return false;
        if (partName.length < 2) return false;

        return true;
    }

    function chatwootHeaders() {
        return {
            'api_access_token': '',
            'Content-Type': 'application/json'
        };
    }

    function getTeamId(type) {
        if (SUBJECT[type] === SUBJECT.NUTRICIONISTA) return 4537;
        if (SUBJECT[type] === SUBJECT.TREINADOR) return 4536;
        if (SUBJECT[type] === SUBJECT.SUPORTE) return 4540;

        return null;
    }

    function getChatwootBaseUrl() {
        return 'https://app.chatwoot.com/api/v1/accounts/accountId';
    }

    function getButtonOptions(planType) {
        switch (planType.value) {
            case PLAN_TYPE.BODYBUILDING:
                return [
                    {"title": SUBJECT.TREINADOR.toString(), "value": SUBJECT.TREINADOR.toString()},
                    {"title": SUBJECT.SUPORTE.toString(), "value": SUBJECT.SUPORTE.toString()}
                ]
            case PLAN_TYPE.DIET:
                return [
                    {"title": SUBJECT.NUTRICIONISTA.toString(), "value": SUBJECT.NUTRICIONISTA.toString()},
                    {"title": SUBJECT.SUPORTE.toString(), "value": SUBJECT.SUPORTE.toString()}
                ]
            default:
                return [
                    {"title": SUBJECT.TREINADOR.toString(), "value": SUBJECT.TREINADOR.toString()},
                    {"title": SUBJECT.NUTRICIONISTA.toString(), "value": SUBJECT.NUTRICIONISTA.toString()},
                    {"title": SUBJECT.SUPORTE.toString(), "value": SUBJECT.SUPORTE.toString()}
                ]
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify('OK')
    };
};
