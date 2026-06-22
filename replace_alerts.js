const fs = require('fs');

const path = 'src/app/school/[subdomain]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('react-hot-toast')) {
  code = code.replace(
    /import React, \{.*?\} from "react";/, 
    match => match + '\nimport { toast } from "react-hot-toast";'
  );
}

code = code.replace(/alert\((.*?(?:[Ss]uccess|[Rr]ecorded|[Ss]aved|[Ii]mported|[Aa]dded|[Dd]eleted|[Pp]rocessed|[Mm]atched).*?)\);/g, 'toast.success($1);');
code = code.replace(/alert\((.*?)\);/g, 'toast.error($1);');

fs.writeFileSync(path, code);
console.log("Successfully replaced alerts with toasts in " + path);
