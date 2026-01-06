function escHtml(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escAttr(s: any) {
  // for href attributes
  return escHtml(s).replaceAll("`", "&#96;");
}

function wrap(title: string, body: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px">${escHtml(title)}</h2>
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
  const title = escHtml(p.eventTitle);
  const when = escHtml(p.when);
  const where = escHtml(p.where ?? "TBA");
  const url = escAttr(p.url);

  return wrap(
    "You're confirmed 🎉",
    `<p>You’re <b>confirmed</b> for <b>${title}</b>.</p>
     <p><b>When:</b> ${when}<br/><b>Where:</b> ${where}</p>
     <p><a href="${url}">View event</a></p>`
  );
}

export function waitlistedEmail(p: { eventTitle: string; url: string }) {
  const title = escHtml(p.eventTitle);
  const url = escAttr(p.url);

  return wrap(
    "You're on the waitlist",
    `<p><b>${title}</b> is currently full, so you’ve been added to the waitlist.</p>
     <p>If a spot opens up, we’ll notify you.</p>
     <p><a href="${url}">View event</a></p>`
  );
}

export function promotedEmail(p: { eventTitle: string; when: string; url: string }) {
  const title = escHtml(p.eventTitle);
  const when = escHtml(p.when);
  const url = escAttr(p.url);

  return wrap(
    "A spot opened up — you're in ✅",
    `<p>You’ve been moved from the waitlist to <b>confirmed</b> for <b>${title}</b>.</p>
     <p><b>Starts:</b> ${when}</p>
     <p><a href="${url}">View event</a></p>`
  );
}

export function reminderEmail(p: {
  eventTitle: string;
  when: string;
  where?: string | null;
  url: string;
  hours: number;
}) {
  const title = escHtml(p.eventTitle);
  const when = escHtml(p.when);
  const where = escHtml(p.where ?? "TBA");
  const url = escAttr(p.url);
  const hours = Number.isFinite(p.hours) ? p.hours : 0;

  return wrap(
    `Reminder: ${p.eventTitle}`,
    `<p><b>${title}</b> starts in about <b>${hours} hour(s)</b>.</p>
     <p><b>When:</b> ${when}<br/><b>Where:</b> ${where}</p>
     <p><a href="${url}">View event</a></p>`
  );
}
