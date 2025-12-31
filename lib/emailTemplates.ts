function wrap(title: string, body: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px">${title}</h2>
    <div style="font-size:14px">${body}</div>
    <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
    <div style="font-size:12px;color:#666">Plannr</div>
  </div>`;
}

export function rsvpConfirmedEmail(p: {
  eventTitle: string;
  when: string;
  where?: string | null;
  url: string;
}) {
  return wrap(
    "You're confirmed 🎉",
    `<p>You’re <b>confirmed</b> for <b>${p.eventTitle}</b>.</p>
     <p><b>When:</b> ${p.when}<br/><b>Where:</b> ${p.where ?? "TBA"}</p>
     <p><a href="${p.url}">View event</a></p>`
  );
}

export function waitlistedEmail(p: { eventTitle: string; url: string }) {
  return wrap(
    "You're on the waitlist",
    `<p><b>${p.eventTitle}</b> is currently full, so you’ve been added to the waitlist.</p>
     <p>If a spot opens up, we’ll notify you.</p>
     <p><a href="${p.url}">View event</a></p>`
  );
}

export function promotedEmail(p: { eventTitle: string; when: string; url: string }) {
  return wrap(
    "A spot opened up — you're in ✅",
    `<p>You’ve been moved from the waitlist to <b>confirmed</b> for <b>${p.eventTitle}</b>.</p>
     <p><b>Starts:</b> ${p.when}</p>
     <p><a href="${p.url}">View event</a></p>`
  );
}

// ✅ UPDATED: add where?: string | null
export function reminderEmail(p: {
  eventTitle: string;
  when: string;
  where?: string | null;
  url: string;
  hours: number;
}) {
  return wrap(
    `Reminder: ${p.eventTitle}`,
    `<p><b>${p.eventTitle}</b> starts in about <b>${p.hours} hour(s)</b>.</p>
     <p><b>When:</b> ${p.when}<br/><b>Where:</b> ${p.where ?? "TBA"}</p>
     <p><a href="${p.url}">View event</a></p>`
  );
}
