import { translations, getLang } from './i18n.js';
import { setFarmerViewTab } from './dashboard.js';

// Multilingual Intent Map for Search Input & Voice Parser
const keywordSynonymMap = {
    "tractor": { category: "machinery", item: "tractor" },
    "tractor driving": { category: "labor", skill: "tractor_driving" },
    "ट्रैक्टर": { category: "machinery", item: "tractor" },
    "ट्रॅक्टर": { category: "machinery", item: "tractor" },
    "ट्रॅक्टर ड्रायव्हिंग": { category: "labor", skill: "tractor_driving" },

    "rotavator": { category: "machinery", item: "rotavator" },
    "tiller": { category: "machinery", item: "rotavator" },
    "रोटावेटर": { category: "machinery", item: "rotavator" },

    "harvesting": { category: "labor", skill: "harvesting" },
    "harvest": { category: "labor", skill: "harvesting" },
    "harvester": { category: "machinery", item: "harvester" },
    "कटाई": { category: "labor", skill: "harvesting" },
    "कापणी": { category: "labor", skill: "harvesting" },
    "कापणी यंत्र": { category: "machinery", item: "harvester" },

    "spraying": { category: "labor", skill: "spraying" },
    "pesticide": { category: "labor", skill: "spraying" },
    "छिड़काव": { category: "labor", skill: "spraying" },
    "फवारणी": { category: "labor", skill: "spraying" },
    "फवारणी यंत्र": { category: "machinery", item: "sprayer" },

    "sowing": { category: "labor", skill: "sowing" },
    "seed sowing": { category: "labor", skill: "sowing" },
    "बीज बोना": { category: "labor", skill: "sowing" },
    "पेरणी": { type: "labor", skill: "sowing" }
};

const voiceSuggestions = {
    en: [
        { text: "Find tractor driving labourers", query: "tractor driving" },
        { text: "Show machinery listings for tractor rental", query: "tractor" },
        { text: "Find pesticide spraying helpers nearby", query: "spraying" },
        { text: "Book harvesting labor", query: "harvesting" }
    ],
    hi: [
        { text: "ट्रैक्टर चालक मजदूरों को खोजें", query: "tractor driving" },
        { text: "किराए के ट्रैक्टरों की सूची दिखाएं", query: "tractor" },
        { text: "छिड़काव करने वाले सहायक खोजें", query: "spraying" },
        { text: "कटाई करने वाले मजदूरों को बुक करें", query: "harvesting" }
    ],
    mr: [
        { text: "ट्रॅक्टर चालक कामगार शोधा", query: "tractor driving" },
        { text: "भाड्याने मिळणारे ट्रॅक्टर दाखवा", query: "tractor" },
        { text: "फवारणी कामगार शोधा", query: "spraying" },
        { text: "कापणी कामगारांचे बुकिंग करा", query: "harvesting" }
    ]
};

export function setupVoice(appState, callbacks) {
    const assistantMicBtn = document.getElementById('assistantMicBtn');
    const closeVoiceWidget = document.getElementById('closeVoiceWidget');
    const voiceMicPulse = document.getElementById('voiceMicPulse');
    const voiceStatusText = document.getElementById('voiceStatusText');

    if (assistantMicBtn) {
        assistantMicBtn.addEventListener('click', () => {
            toggleVoiceAssistantWidget(true);
        });
    }

    if (closeVoiceWidget) {
        closeVoiceWidget.addEventListener('click', () => {
            toggleVoiceAssistantWidget(false);
        });
    }

    if (voiceMicPulse) {
        voiceMicPulse.addEventListener('click', () => {
            if (voiceMicPulse.classList.contains('listening')) {
                voiceMicPulse.classList.remove('listening');
                voiceStatusText.innerText = getLang() === 'en' ? "Microphone idle" : getLang() === 'hi' ? "माइक निष्क्रिय" : "माइक निष्क्रिय";
            } else {
                voiceMicPulse.classList.add('listening');
                voiceStatusText.innerText = translations[getLang()].voiceStatusListening;
                
                // Simulated speech response trigger
                setTimeout(() => {
                    simulateVoiceSpeech("Find pesticide spraying helpers", "spraying", appState, callbacks);
                }, 2500);
            }
        });
    }

    // Expose search simulation logic inside dev center test buttons
    const devSearchSimBtn = document.getElementById('devSearchSimBtn');
    const devSearchSimInput = document.getElementById('devSearchSimInput');
    const devSearchSimResult = document.getElementById('devSearchSimResult');

    if (devSearchSimBtn) {
        devSearchSimBtn.addEventListener('click', () => {
            const input = devSearchSimInput.value.toLowerCase().trim();
            devSearchSimResult.style.display = 'block';

            if (!input) {
                devSearchSimResult.innerHTML = '<p style="color: #f87171;">Please enter a search query.</p>';
                return;
            }

            let matchedKey = null;
            for (const k in keywordSynonymMap) {
                if (input.includes(k)) {
                    matchedKey = k;
                    break;
                }
            }

            if (matchedKey) {
                const mapped = keywordSynonymMap[matchedKey];
                devSearchSimResult.innerHTML = `
                    <div style="background: rgba(14, 165, 233, 0.1); border: 1px solid #0ea5e9; padding: 12px; border-radius: 8px; font-size: 0.85rem;">
                        <p style="color: #38bdf8; font-weight: 700; margin-bottom: 4px;">✔ Resolved Keyword Match!</p>
                        <p><strong>Query Term:</strong> "${input}" matched mapping rule <strong>"${matchedKey}"</strong></p>
                        <p><strong>Resolved Database Target:</strong> Category: <code>${mapped.category}</code>, Target matching index tag: <code>${mapped.skill || mapped.item}</code></p>
                        <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.75rem;">Backend geo query will trigger matching coordinates filter.</p>
                    </div>
                `;
            } else {
                devSearchSimResult.innerHTML = `
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; font-size: 0.85rem;">
                        <p style="color: #fbbf24; font-weight: 700; margin-bottom: 4px;">⚠ Fuzzy Match Fallback</p>
                        <p>No exact synonym mapped. Query will fallback to database description wildcard search match.</p>
                    </div>
                `;
            }
        });
    }
}

export function renderVoiceSuggestions(appState, callbacks) {
    const suggestions = voiceSuggestions[getLang()] || voiceSuggestions.en;
    const container = document.getElementById('voiceSuggestionsBox');
    if (!container) return;

    container.innerHTML = '';
    suggestions.forEach(item => {
        const chip = document.createElement('button');
        chip.className = 'voice-suggestion-chip';
        chip.innerHTML = `<i class="fa-solid fa-play"></i> "${item.text}"`;
        chip.onclick = () => simulateVoiceCommand(item.text, item.query, appState, callbacks);
        container.appendChild(chip);
    });
}

export function toggleVoiceAssistantWidget(show) {
    const widget = document.getElementById('voiceAssistantWidget');
    if (!widget) return;

    if (show) {
        widget.style.display = 'flex';
        const body = document.getElementById('voiceChatBody');
        body.scrollTop = body.scrollHeight;
    } else {
        widget.style.display = 'none';
    }
}

export function speakResponse(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (getLang() === 'hi') {
            utterance.lang = 'hi-IN';
        } else if (getLang() === 'mr') {
            utterance.lang = 'mr-IN';
        } else {
            utterance.lang = 'en-IN';
        }
        
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    }
}

export function simulateVoiceCommand(spokenText, queryStr, appState, callbacks) {
    const body = document.getElementById('voiceChatBody');
    if (!body) return;

    const userBubble = document.createElement('div');
    userBubble.className = 'voice-chat-bubble bubble-user';
    userBubble.innerText = spokenText;
    body.appendChild(userBubble);
    
    body.scrollTop = body.scrollHeight;

    const status = document.getElementById('voiceStatusText');
    status.innerText = getLang() === 'en' ? "Parsing voice intent..." : getLang() === 'hi' ? "आवाज को समझ रहे हैं..." : "आवाज समजून घेत आहे...";

    setTimeout(() => {
        status.innerText = translations[getLang()].voiceStatusListening;
        
        // Resolve intent using keyword synonym mapper
        const match = keywordSynonymMap[queryStr];
        
        let responseText = '';
        if (match) {
            document.getElementById('dashboardSearch').value = queryStr;
            
            if (match.category === 'labor') {
                setFarmerViewTab('labor', appState, callbacks);
                callbacks.renderListings(queryStr);
                
                const skillLabel = translations[getLang()]['skill_' + (match.skill_clean || match.skill)] || match.skill;
                responseText = getLang() === 'en' 
                    ? `I have filtered ${skillLabel} helpers within 10 kilometers. Here are the matches.`
                    : getLang() === 'hi'
                    ? `मैंने 10 किलोमीटर के दायरे में ${skillLabel} सहायकों को फ़िल्टर कर दिया है। ये रहे परिणाम।`
                    : `मी 10 किलोमीटरच्या परिसरात ${skillLabel} मदतनीस शोधले आहेत. हे आहेत परिणाम.`;
            } else {
                setFarmerViewTab('machinery', appState, callbacks);
                callbacks.renderListings(queryStr);
                
                responseText = getLang() === 'en' 
                    ? `I found rental ${queryStr} listings available within 10 kilometers.`
                    : getLang() === 'hi'
                    ? `मुझे 10 किलोमीटर के दायरे में किराए के लिए उपलब्ध ${queryStr} मिले हैं।`
                    : `मला 10 किलोमीटरच्या परिसरात भाड्याने मिळणारे ${queryStr} सापडले आहेत.`;
            }
        } else {
            responseText = getLang() === 'en'
                ? "I didn't understand the command. Could you repeat, please?"
                : getLang() === 'hi'
                ? "मुझे निर्देश समझ में नहीं आया। क्या आप दोहरा सकते हैं?"
                : "मला आदेश समजला नाही. कृपया पुन्हा सांगू शकाल का?";
        }

        const botBubble = document.createElement('div');
        botBubble.className = 'voice-chat-bubble bubble-bot';
        botBubble.innerText = responseText;
        body.appendChild(botBubble);
        
        body.scrollTop = body.scrollHeight;
        speakResponse(responseText);

    }, 1500);
}

function simulateVoiceSpeech(query, tag, appState, callbacks) {
    const mic = document.getElementById('voiceMicPulse');
    if (!mic) return;

    mic.classList.remove('listening');
    
    let sentence = "";
    if (getLang() === 'en') {
        sentence = `Show me ${query}`;
    } else if (getLang() === 'hi') {
        sentence = `छिड़काव करने वाले मजदूरों को खोजें`;
        tag = "spraying";
    } else {
        sentence = `फवारणी कामगार दाखवा`;
        tag = "spraying";
    }

    simulateVoiceCommand(sentence, tag, appState, callbacks);
}
