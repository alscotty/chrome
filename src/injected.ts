import InjectedCommandHandler from "./injected-command-handler";

console.log("Serenade injected script loading...");

const handler = new InjectedCommandHandler();

document.addEventListener(`serenade-injected-script-command-request`, async (e: any) => {
  console.log("Injected script received command:", e.detail.data);
  const command = e.detail.data;
  let handlerResponse = null;
  
  if (command.type in (handler as any)) {
    console.log("Executing command:", command.type);
    handlerResponse = await (handler as any)[command.type](command);
    console.log("Command response:", handlerResponse);
  } else {
    console.warn("Unknown command type:", command.type);
  }

  document.dispatchEvent(
    new CustomEvent(`serenade-injected-script-command-response`, {
      detail: {
        id: e.detail.id,
        data: handlerResponse,
      },
    })
  );
});

console.log("Injected script ready, dispatching ready event");
document.dispatchEvent(new CustomEvent('serenade-injected-script-ready'));


