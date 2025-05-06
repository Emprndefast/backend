const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const db = getFirestore();

// Clientes CRM
exports.getCustomers = async (req, res) => {
  try {
    const snapshot = await db.collection('crm_customers').get();
    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(customers);
  } catch (error) {
    console.error('Error al obtener clientes CRM:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const ref = await db.collection('crm_customers').add(data);
    res.json({ id: ref.id, ...data });
  } catch (error) {
    console.error('Error al crear cliente CRM:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const doc = await db.collection('crm_customers').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error al obtener cliente CRM:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const ref = db.collection('crm_customers').doc(req.params.id);
    await ref.update({
      ...req.body,
      updatedAt: Timestamp.now()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar cliente CRM:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Seguimientos (Follow-ups)
exports.addFollowUp = async (req, res) => {
  try {
    const customerRef = db.collection('crm_customers').doc(req.params.id);
    const followUpData = {
      ...req.body,
      createdAt: Timestamp.now()
    };
    await customerRef.collection('followups').add(followUpData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error al agregar seguimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getFollowUps = async (req, res) => {
  try {
    const snapshot = await db.collection('crm_customers')
      .doc(req.params.id)
      .collection('followups')
      .get();
    const followUps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(followUps);
  } catch (error) {
    console.error('Error al obtener seguimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Tareas
exports.addTask = async (req, res) => {
  try {
    const customerRef = db.collection('crm_customers').doc(req.params.id);
    const taskData = {
      ...req.body,
      status: 'pending',
      createdAt: Timestamp.now()
    };
    await customerRef.collection('tasks').add(taskData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error al agregar tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const snapshot = await db.collection('crm_customers')
      .doc(req.params.id)
      .collection('tasks')
      .get();
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Notas
exports.addNote = async (req, res) => {
  try {
    const customerRef = db.collection('crm_customers').doc(req.params.id);
    const noteData = {
      ...req.body,
      createdAt: Timestamp.now()
    };
    await customerRef.collection('notes').add(noteData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error al agregar nota:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const snapshot = await db.collection('crm_customers')
      .doc(req.params.id)
      .collection('notes')
      .get();
    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(notes);
  } catch (error) {
    console.error('Error al obtener notas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 