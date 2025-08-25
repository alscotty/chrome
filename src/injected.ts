import InjectedCommandHandler from "./injected-command-handler";

const handler = new InjectedCommandHandler();

document.addEventListener(`serenade-injected-script-command-request`, async (e: any) => {
  const command = e.detail.data;
  let handlerResponse = null;
  
  if (command.type in (handler as any)) {
    handlerResponse = await (handler as any)[command.type](command);
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

document.dispatchEvent(new CustomEvent('serenade-injected-script-ready'));


