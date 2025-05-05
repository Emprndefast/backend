const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'notifications/email.js',
  'notifications/socket.js',
  'models/Customer.js',
  'models/Notification.js',
  'models/Product.js',
  'models/Sale.js',
  'models/StockMovement.js',
  'models/Supplier.js',
  'models/User.js',
  'models/Settings.js',
  'models/Report.js',
  'models/Purchase.js',
  'models/Location.js',
  'models/Integration.js',
  'models/Category.js',
  'models/Business.js',
  'models/AuditLog.js',
  'middleware/validation.js',
  'middleware/planLimits.js',
  'middleware/plan.js',
  'middleware/auth.js',
  'controllers/userController.js',
  'controllers/saleController.js',
  'controllers/productController.js',
  'controllers/businessController.js'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      /const logger = require\('\.\.\/logs\/logger'\);/g,
      'const { logger, errorLogger } = require(\'../logs/logger\');'
    );
    fs.writeFileSync(filePath, content);
    console.log(`Actualizado: ${file}`);
  }
}); 