// Default SEO meta + page content, editable afterwards in Admin -> SEO & Content.
// Placeholders replaced at render time: {site} (site name), {year} (current year), {domain} (site URL).

const h = (tag, text) => `<${tag} class="content-heading">${text}</${tag}>`;
const p = (text) => `<p class="content-para">${text}</p>`;

const home = [
  h('h1', '{site} – Trusted Satta King Live & Online Results Platform'),
  p('<strong>Welcome to {site} – India\'s trusted result information hub.</strong>'),
  p(`If you track Satta King results daily, you already know the frustration — jumping between five different websites, staring at slow-loading pages, and still not getting the result on time. That's exactly the problem {site} was built to solve.<br>
This platform exists for one reason: to give you accurate, fast, and easy-to-read Satta King results for all major markets — every single day. Whether it's the early morning Disawar result or the late-night Gali update, the numbers go live the moment they're declared.<br>
We cover the big four — Gali, Disawar, Faridabad, and Ghaziabad — and regional markets like Prayagraj, Delhi Bazaar, Shri Ganesh, Noida Night, Roop Nagar, Palika Bazar and more.`),
  h('h2', "Today's Satta King Live Result – {year}"),
  p(`Results are updated throughout the day as each game is officially declared. You'll find today's live results alongside yesterday's numbers, so you can compare at a glance. The page refreshes itself, so no manual refresh is needed.`),
  h('h3', 'Gali Satta King Result'),
  p('Gali is one of the most followed games, with the result declared late at night — around 11:50 PM — usually the last major update of the day.<br>Result Time: 11:50 PM daily'),
  h('h3', 'Disawar Satta King Result'),
  p('Disawar is the oldest name in the Satta King world. The result comes in the early hours — 2:00 AM — making it the first result of each new day.<br>Result Time: 2:00 AM daily'),
  h('h3', 'Faridabad Satta King Result'),
  p('Faridabad is a key evening game, declaring around 6:20 PM, popular across Haryana and Delhi-NCR.<br>Result Time: 6:20 PM daily'),
  h('h3', 'Ghaziabad Satta King Result'),
  p('Ghaziabad declares around 9:30 PM and is widely followed across Uttar Pradesh and Delhi.<br>Result Time: 9:30 PM daily'),
  h('h3', 'Delhi Bazaar Satta King Result'),
  p('Delhi Bazaar is an afternoon game declared around 2:50 PM, one of the first major afternoon markets.<br>Result Time: 2:50 PM daily'),
  h('h3', 'Shri Ganesh Satta King Result'),
  p('Shri Ganesh results come in the late afternoon around 4:10 PM, between the afternoon markets and the big evening games.<br>Result Time: 4:10 PM daily'),
  h('h2', 'Why People Come Back to {site} Every Day'),
  h('h3', "Results Go Live the Moment They're Declared"),
  p('Results go live immediately after they are officially declared — day or night.'),
  h('h3', 'Every Major Game Covered Under One Roof'),
  p('All major games — Gali, Disawar, Faridabad, Ghaziabad, Delhi Bazaar, Shri Ganesh and many regional markets — on one page, in one clean result table.'),
  h('h3', 'We Don\'t Make False Claims'),
  p('{site} does not sell "leak numbers", "fix jodi" or "guaranteed results". Any website that does is running a scam. There are no guaranteed results — anyone who says otherwise is lying.'),
  h('h2', 'Frequently Asked Questions'),
  h('h3', 'How do I check today\'s Satta King live result?'),
  p('Scroll up to the Live Results section. The table shows yesterday\'s result and today\'s live update side by side.'),
  h('h3', 'Is {site} a gambling or betting website?'),
  p('No. {site} does not host, run or facilitate any gambling or betting activity. It is a results information website only.'),
  h('h3', 'Can past results help predict future numbers?'),
  p('No. Results are chance-based; past numbers do not influence future ones. Never pay anyone for "sure shot" numbers.'),
  h('h3', 'Why are some results showing "waiting"?'),
  p('Each game has a fixed result time. Until the result is officially declared the status shows as waiting; it updates automatically once declared.'),
].join('\n');

const privacy = [
  h('h1', 'Privacy Policy for {site}'),
  p('At {site}, accessible at {domain}, the privacy of our visitors is of utmost importance to us. This Privacy Policy outlines the types of information we collect, how we use it, and the steps we take to safeguard it. By using our website, you agree to the terms described in this Privacy Policy.'),
  h('h2', 'About This Website'),
  p('{site} is an informational website that displays result data for reference purposes only. We do not facilitate, promote, or encourage any form of gambling or betting. This website is strictly intended for users who are 18 years of age or older.'),
  h('h2', 'Information We Collect'),
  p(`a) Information You Provide — if you contact us directly we may collect your name, email address and the content of your message.<br>
b) Information Collected Automatically — IP address, browser type and version, device type and operating system, pages visited and time spent, referring/exit URLs, and date and time of visit. This is used solely for analytics, security monitoring and performance improvement.`),
  h('h2', 'How We Use Your Information'),
  p('To operate and maintain the website, analyse traffic, improve content and performance, respond to your queries, prevent fraudulent activity and comply with applicable laws. We do not sell, rent or trade your personal information.'),
  h('h2', 'Cookies'),
  p('We use session, analytics and advertising cookies to enhance user experience. You can control or disable cookies through your browser settings at any time.'),
  h('h2', 'Third-Party Services'),
  p('We may use Google Analytics and Google AdSense. These third parties have their own privacy policies; we are not responsible for their practices.'),
  h('h2', 'Data Security'),
  p('We implement reasonable technical and organisational measures to protect your information. No method of transmission over the internet is 100% secure.'),
  h('h2', "Children's Privacy"),
  p('{site} is intended for users aged 18 and above. We do not knowingly collect personal information from minors.'),
  h('h2', 'Applicable Law — India'),
  p('This website is governed by the laws of the Republic of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.'),
  h('h2', 'Changes to This Policy'),
  p('We may update this Privacy Policy from time to time. Continued use of the website after changes constitutes acceptance of the revised policy.'),
  h('h2', 'Contact Us'),
  p('For any questions about this Privacy Policy, please use our <a href="/contact-us">Contact page</a>.'),
].join('\n');

const terms = [
  h('h1', 'Terms and Conditions'),
  p('Welcome to {site}. By accessing or using our website at {domain}, you agree to be bound by the following Terms and Conditions. If you do not agree with any part of these terms, you must discontinue use of this website immediately.'),
  h('h2', 'About This Website'),
  p('{site} publishes result data for reference purposes only. We are a non-commercial platform and do not conduct, facilitate, or promote any gambling, betting, or wagering activities.'),
  h('h2', 'Age Restriction'),
  p('This website is intended only for users aged 18 years and above.'),
  h('h2', 'Acceptance of Terms'),
  p(`By accessing {site}, you acknowledge that you have read and agree to these terms, that you access the website at your own risk, that Satta/Matka-related activities may be restricted or illegal in your state or country, and that you are responsible for complying with the laws of your jurisdiction.`),
  h('h2', 'Intellectual Property'),
  p('All content on {site} is our property unless otherwise noted. You may view it for personal, non-commercial use only. You must not republish, sell, redistribute or scrape it.'),
  h('h2', 'Disclaimer of Liability'),
  p('Result information is published on a best-effort basis with no guarantee of accuracy, completeness or timeliness. We are not responsible for any loss arising from your use of this website.'),
  h('h2', 'Third-Party Links & Advertisements'),
  p('This website may display third-party advertisements and links. We are not responsible for their content or practices.'),
  h('h2', 'Governing Law'),
  p('These terms are governed by the laws of the Republic of India. Disputes are subject to the exclusive jurisdiction of the competent courts in India.'),
  h('h2', 'Changes to These Terms'),
  p('We may modify these terms at any time. Continued use of the website constitutes acceptance of the revised terms.'),
].join('\n');

const contact = [
  h('h1', 'Contact Us'),
  p('For questions about results shown on {site}, corrections, or to request a market be added to our tracking list, reach us on WhatsApp using the button below.'),
].join('\n');

export const SEO_SEED = [
  {
    page_key: 'home',
    meta_title: '{site} | Satta King Live Result Today {year}',
    meta_description: 'Check {site} for fast Satta King live results, today and yesterday results, and the monthly record chart for Gali, Disawar, Faridabad, Ghaziabad and more.',
    meta_keywords: 'satta king, satta result, satta chart, gali result, disawar result',
    page_content: home,
  },
  {
    page_key: 'home_2',
    meta_title: 'Satta Khaiwal Result Today {year} | {site}',
    meta_description: 'Satta Khaiwal live result today with yesterday results and the full monthly chart on {site}.',
    meta_keywords: 'satta khaiwal, satta king result',
    page_content: [h('h1', 'Satta Khaiwal Result Today {year}'), p('Live Satta results for all major markets, updated the moment they are declared.')].join('\n'),
  },
  {
    page_key: 'home_3',
    meta_title: 'Lucky Satta King Result Today {year} | {site}',
    meta_description: 'Lucky Satta King live result today, yesterday results and the monthly chart on {site}.',
    meta_keywords: 'lucky satta king, satta king result',
    page_content: [h('h1', 'Lucky Satta King Result Today {year}'), p('Live Satta results for all major markets, updated the moment they are declared.')].join('\n'),
  },
  {
    page_key: 'chart',
    meta_title: 'Satta King Record Chart {year} | {site}',
    meta_description: 'Full Satta King record chart {year} for every game — Gali, Disawar, Faridabad, Ghaziabad and more on {site}.',
    meta_keywords: 'satta chart, satta king record chart',
    page_content: '',
  },
  {
    page_key: 'game-record',
    meta_title: '{game} Record Chart {year} | {site}',
    meta_description: '{game} record chart {year}: day-by-day {game} results for every month on {site}.',
    meta_keywords: '{game} record, {game} chart, {game} result',
    page_content: '',
  },
  {
    page_key: 'contact-us',
    meta_title: 'Contact Us | {site}',
    meta_description: 'Contact {site} for result queries and corrections.',
    meta_keywords: '',
    page_content: contact,
  },
  {
    page_key: 'privacy-policy',
    meta_title: 'Privacy Policy | {site}',
    meta_description: 'Privacy Policy of {site}.',
    meta_keywords: '',
    page_content: privacy,
  },
  {
    page_key: 'terms-conditions',
    meta_title: 'Terms & Conditions | {site}',
    meta_description: 'Terms and Conditions of {site}.',
    meta_keywords: '',
    page_content: terms,
  },
];
