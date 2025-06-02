
export const name = "ready";
export const once = true;
export async function execute(client) {
  console.log(`✅ Focus Buddy is online! Logged in as ${client.user.tag}`);
}
