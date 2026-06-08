import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
   Hooks.on("createChatMessage", async (msg) => {
    if (msg.author.id !== game.user.id) {
      return;
    }
    const itemId = msg.system?.weaponId || msg.system?.spellId || msg.system?.skillId || msg.flags?.dcc?.ItemId;
    let compiledData = await getRequiredData({
      itemId,
      actorId: msg.speaker?.actor,
      tokenId: msg.speaker?.token,
      workflow: msg
    });
    runDcc(compiledData);
  });
}

async function runDcc(input) {
  const handler = await AAHandler.make(input)
  trafficCop(handler);
}
