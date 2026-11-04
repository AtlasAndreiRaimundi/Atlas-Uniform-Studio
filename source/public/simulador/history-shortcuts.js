// Keep native text editing intact, including editable descendants and IME input.
export function historyShortcut(event,{blocked=false,modal=false}={}) {
 if(blocked||modal||event.defaultPrevented||event.isComposing||event.altKey||!(event.ctrlKey||event.metaKey))return null;
 const path=event.composedPath?.()??[event.target];
 if(path.some(target=>target?.isContentEditable||target?.closest?.('[role="textbox"]')||/^(TEXTAREA|SELECT)$/.test(target?.tagName)||target?.tagName==='INPUT'&&!['range','checkbox','radio','button','submit','reset'].includes(target.type)))return null;
 const key=event.key?.toLowerCase();
 if(key==='z')return event.shiftKey?'redo':'undo';
 if(key==='y'&&!event.shiftKey)return 'redo';
 return null;
}
export function handleHistoryShortcut(event,options,apply) {
 const action=historyShortcut(event,options);if(!action)return false;
 event.preventDefault();
 // A held key must not erase multiple steps before the user can inspect them.
 if(!event.repeat)apply(action);
 return true;
}
