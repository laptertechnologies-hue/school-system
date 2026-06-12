const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(
    'contactEmail: email,\n        contactPhone: phone,',
    'contactEmail: email,\n        contactPhone: phone,\n        currentTerm: 1,\n        currentYear: new Date().getFullYear(),'
  );
  content = content.replace(
    'contactEmail: `head@${randomSub}.ug`,\n        contactPhone: "+256 772 " + Math.floor(Math.random() * 900000 + 100000),',
    'contactEmail: `head@${randomSub}.ug`,\n        contactPhone: "+256 772 " + Math.floor(Math.random() * 900000 + 100000),\n        currentTerm: 1,\n        currentYear: new Date().getFullYear(),'
  );
  fs.writeFileSync(filepath, content, 'utf8');
}

patchFile('src/app/page.tsx');
patchFile('src/app/super-admin/page.tsx');
console.log("Patched page.tsx and super-admin/page.tsx");
