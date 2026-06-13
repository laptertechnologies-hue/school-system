const fs = require('fs');
const css = `

.modal-overlay { 
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background-color: rgba(15, 23, 42, 0.6); 
  backdrop-filter: blur(4px); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 1050; 
  padding: 20px; 
  overflow-y: auto; 
}
.modal-content { 
  background: #ffffff; 
  border-radius: 12px; 
  padding: 24px; 
  width: 100%; 
  max-width: 600px; 
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); 
  position: relative; 
  margin: auto; 
}
`;
fs.appendFileSync('src/app/globals.css', css);
console.log("CSS appended");
