const input = document.getElementById("scriptUpload");
const output = document.getElementById("returnList");

var rules = [];
window.fetch("./rules.json").then(x => { console.log(x); return x.json() }).then(x => rules = x);

var groups = {};
window.fetch("./groups.json").then(x => x.json()).then(x => groups = x);

input.onchange = (evt) => {
  console.log(rules);
  console.log(groups);
  
  if(!window.FileReader) return; // Browser is not compatible

  output.replaceChildren();

  const reader = new FileReader();

  reader.onload = (evt) => {
    if(evt.target.readyState != 2) return;
    if(evt.target.error) {
      alert('Error while reading file');
      return;
    }

    try {
      const filecontent = JSON.parse(evt.target.result);
      checkScript(filecontent);
    }
    catch (e) {
      if (e.name == 'SyntaxError') {
        alert('Error while parsing file');
      } else {
        throw e;
      }
    }
};

  reader.readAsText(evt.target.files[0]);
};

function parseRule(rule, script) {  
  if (rule.missing) {
    if (passesPresenceCheck(script, rule.missing)) return false;
  }
  
  if (rule.present) {
    if (!passesPresenceCheck(script, rule.present)) return false;
  }
  
  if (rule.count) {
    const count = countGroup(script, rule.count.characters);
    
    if (rule.count.gt && count <= rule.count.gt) return false;
    if (rule.count.lt && count >= rule.count.lt) return false;
    if (rule.count.eq && count != rule.count.eq) return false;
  }
  
  return true;
}

function passesPresenceCheck(script, presence) {
  let result;
    
  for (let grp of presence) {
    // AND all the groups
    result = false;

    for (let elt of grp) {
      // OR all the elements of the group
      if (recursivePresence(elt, script)) {
        result = true;
        break
      }
    }

    if (!result) return false;
  }
  
  return true;
}

function countGroup(script, group) {
  let total = 0;
  
  for (let elt of group) {
    // Count the presence of all the elements of the group in the script
    total += recursivePresence(elt, script);
  }
  
  return total;
}

function recursivePresence(char, script) {
  let total = 0;
  
  if (groups[char]) {
    for (var elt of groups[char]) {
      total += recursivePresence(elt, script);
    }
  }
  
  if (script.includes(char)) total++;
  
  return total;
}

function checkScript(scriptJson) {
  // Transform filecontent according to your specifications
  scriptJson = scriptJson.map((item) => {
    if (item.id === '_meta') {
      return {
        author: item.author,
        name: item.name,
        isOfficial: false,
        id: item.id,
      }
    } else {
      if (item.id) {
        return { id: item.id }
      } else {
        return { id: item }
      }
    }
  })

  console.log(scriptJson)
  scriptJson = scriptJson.filter((e) => e.id).map((e) => e.id)

  for (let elt of rules) {
    if (parseRule(elt, scriptJson)) {
      const msg = document.createElement('li')

      if (elt.note) {
        msg.innerHTML = elt.note
      } else if (elt.warning) {
        msg.style.color = 'yellow'
        msg.innerHTML = elt.warning
      } else if (elt.error) {
        msg.style.color = 'red'
        msg.innerHTML = elt.error
      }

      output.appendChild(msg)
    }
  }
}

(function initDragAndDrop() {
  document.addEventListener('paste', (evt) => {
    output.replaceChildren(); // clear output element of any printed messages
    const pastedText = evt.clipboardData.getData('text/plain');
    try {
      const scriptJson = JSON.parse(pastedText);
      console.log({scriptJson})
      window.checkScript(scriptJson);
    } catch (err) {
      alert('Unable to detect script JSON, please try again.');
      console.error(err)
    }
  });

  const dragIn = (evt) => {
    input.classList.add('drag-active');
  }

  const dragOut = (evt) => {
    input.classList.remove('drag-active');
  }

  if (input) {
    input.addEventListener('dragenter', dragIn);
    input.addEventListener('dragleave', dragOut);
    input.addEventListener('drop', dragOut);
  }
})()
