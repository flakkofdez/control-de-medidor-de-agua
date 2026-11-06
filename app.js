/**
 * CONTROL DE CONSUMO DE AGUA - EDIFICIO EL ÁLAMO ETAPA 1
 * Lógica matemática, reactividad en tiempo real, persistencia híbrida (LocalStorage + IndexedDB),
 * compresión inteligente de fotos de medidores y exportación a PDF de alta resolución sin cortes.
 */

(function () {
  'use strict';

  // Claves de almacenamiento local y base de datos
  const STORAGE_KEY_DATA = 'water_app_departments_v2';
  const STORAGE_KEY_RATE = 'water_app_rate_v2';
  const STORAGE_KEY_PERIOD = 'water_app_period_v2';
  const STORAGE_KEY_DATE_PREV = 'water_app_date_prev_v2';
  const STORAGE_KEY_DATE_CURR = 'water_app_date_curr_v2';

  const DB_NAME = 'AguaAlamoPhotosDB_v1';
  const DB_VERSION = 1;
  const STORE_NAME = 'meter_photos';

  const BUILDING_NAME = 'El Álamo Etapa 1';

  /**
   * Genera las fechas por defecto: hoy para lectura actual y un mes antes para anterior
   */
  function getDefaultDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currDate = `${year}-${month}-${day}`;

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const prevDay = String(prevMonthDate.getDate()).padStart(2, '0');
    const prevDate = `${prevYear}-${prevMonth}-${prevDay}`;

    return { currDate, prevDate };
  }

  /**
   * Formatea una fecha ISO (YYYY-MM-DD) a formato legible peruano (DD/MM/AAAA)
   */
  function formatDateDisplay(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  }

  const initialDates = getDefaultDates();

  // Lista oficial de 22 departamentos y tiendas precargados en 0.000
  const DEFAULT_DEPARTMENTS = [
    { id: 'dept-101', name: 'Dpto 101', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-201', name: 'Dpto 201', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-202', name: 'Dpto 202', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-203', name: 'Dpto 203', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-301', name: 'Dpto 301', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-302', name: 'Dpto 302', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-303', name: 'Dpto 303', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-401', name: 'Dpto 401', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-402', name: 'Dpto 402', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-403', name: 'Dpto 403', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-501', name: 'Dpto 501', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-502', name: 'Dpto 502', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-503', name: 'Dpto 503', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-601', name: 'Dpto 601', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-602', name: 'Dpto 602', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-603', name: 'Dpto 603', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-604', name: 'Dpto 604', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-605', name: 'Dpto 605', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-606', name: 'Dpto 606', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-607', name: 'Dpto 607', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-t501', name: 'Tienda 501', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate },
    { id: 'dept-t503', name: 'Tienda 503', prev: 0, curr: 0, photo: null, datePrev: initialDates.prevDate, dateCurr: initialDates.currDate }
  ];

  const DEFAULT_RATE = 4.00;
  const DEFAULT_PERIOD = 'Noviembre 2026';

  // Estado global de la aplicación
  let state = {
    rate: DEFAULT_RATE,
    period: DEFAULT_PERIOD,
    datePrev: initialDates.prevDate,
    dateCurr: initialDates.currDate,
    departments: []
  };

  // Elementos del DOM
  const elements = {
    rateInput: document.getElementById('global-rate'),
    periodInput: document.getElementById('reading-period'),
    globalDatePrevInput: document.getElementById('global-date-prev'),
    globalDateCurrInput: document.getElementById('global-date-curr'),
    thDatePrevSubtext: document.getElementById('th-date-prev-subtext'),
    thDateCurrSubtext: document.getElementById('th-date-curr-subtext'),
    tableBody: document.getElementById('table-body'),
    btnAddRow: document.getElementById('btn-add-row'),
    rowsCount: document.getElementById('rows-count'),
    totalConsumption: document.getElementById('total-consumption'),
    totalPayment: document.getElementById('total-payment'),
    btnExportPdfTop: document.getElementById('btn-export-pdf-top'),
    btnExportPdfBottom: document.getElementById('btn-export-pdf-bottom'),
    btnClearAllPhotos: document.getElementById('btn-clear-all-photos'),
    // Modal de imagen
    photoModal: document.getElementById('photo-modal'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalImg: document.getElementById('modal-img'),
    modalCaption: document.getElementById('modal-caption')
  };

  // ==========================================================================
  // GESTOR DE INDEXEDDB PARA FOTOS (SIN LÍMITE DE CUOTA DE 5MB)
  // ==========================================================================

  function openPhotoDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => {
        console.warn('Error abriendo IndexedDB', e);
        resolve(null);
      };
    });
  }

  async function savePhotoToDB(id, photoDataUrl) {
    try {
      const db = await openPhotoDB();
      if (!db) return;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id, photo: photoDataUrl });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {
      console.warn('Error guardando foto en DB', e);
    }
  }

  async function deletePhotoFromDB(id) {
    try {
      const db = await openPhotoDB();
      if (!db) return;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {
      console.warn('Error eliminando foto de DB', e);
    }
  }

  async function clearAllPhotosFromDB() {
    try {
      const db = await openPhotoDB();
      if (!db) return;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {
      console.warn('Error eliminando todas las fotos de DB', e);
    }
  }

  async function loadAllPhotosFromDB() {
    try {
      const db = await openPhotoDB();
      if (!db) return {};
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const map = {};
          (req.result || []).forEach(item => {
            map[item.id] = item.photo;
          });
          resolve(map);
        };
        req.onerror = () => resolve({});
      });
    } catch (e) {
      console.warn('Error cargando fotos de DB', e);
      return {};
    }
  }

  // ==========================================================================
  // ESTADO Y PERSISTENCIA
  // ==========================================================================

  /**
   * Carga el estado guardado y sincroniza las fotos desde IndexedDB
   */
  async function loadState() {
    try {
      const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
      if (savedRate !== null) {
        const parsedRate = parseFloat(savedRate);
        state.rate = !isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : DEFAULT_RATE;
      } else {
        state.rate = DEFAULT_RATE;
      }

      const savedPeriod = localStorage.getItem(STORAGE_KEY_PERIOD);
      state.period = savedPeriod && savedPeriod.trim() !== '' ? savedPeriod.trim() : DEFAULT_PERIOD;

      const savedDatePrev = localStorage.getItem(STORAGE_KEY_DATE_PREV);
      state.datePrev = savedDatePrev && savedDatePrev.trim() !== '' ? savedDatePrev : initialDates.prevDate;

      const savedDateCurr = localStorage.getItem(STORAGE_KEY_DATE_CURR);
      state.dateCurr = savedDateCurr && savedDateCurr.trim() !== '' ? savedDateCurr : initialDates.currDate;

      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      if (savedData !== null) {
        state.departments = JSON.parse(savedData);
      } else {
        state.departments = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
      }

      // Asegurar que cada departamento tenga sus fechas asignadas
      state.departments.forEach(dept => {
        if (!dept.datePrev) dept.datePrev = state.datePrev;
        if (!dept.dateCurr) dept.dateCurr = state.dateCurr;
      });

      // Cargar todas las fotos de IndexedDB
      const photosMap = await loadAllPhotosFromDB();
      state.departments.forEach(dept => {
        if (photosMap[dept.id]) {
          dept.photo = photosMap[dept.id];
        } else if (dept.photo) {
          // Migrar foto existente a IndexedDB si estaba en localStorage
          savePhotoToDB(dept.id, dept.photo);
        } else {
          dept.photo = null;
        }
      });
    } catch (e) {
      console.warn('Error al leer de localStorage. Usando valores predeterminados.', e);
      state.rate = DEFAULT_RATE;
      state.period = DEFAULT_PERIOD;
      state.datePrev = initialDates.prevDate;
      state.dateCurr = initialDates.currDate;
      state.departments = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
    }
  }

  /**
   * Guarda los datos de texto en localStorage (manteniendo la cuota limpia)
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_RATE, state.rate.toString());
      localStorage.setItem(STORAGE_KEY_PERIOD, state.period);
      localStorage.setItem(STORAGE_KEY_DATE_PREV, state.datePrev);
      localStorage.setItem(STORAGE_KEY_DATE_CURR, state.dateCurr);
      // Guardar sólo metadatos livianos en localStorage (las fotos van en IndexedDB)
      const lightData = state.departments.map(d => ({
        id: d.id,
        name: d.name,
        prev: d.prev,
        curr: d.curr,
        datePrev: d.datePrev,
        dateCurr: d.dateCurr
      }));
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(lightData));
    } catch (e) {
      console.warn('Error al guardar en localStorage', e);
    }
  }

  // ==========================================================================
  // COMPRESIÓN DE FOTO INTELIGENTE (SIN CORTES, NÍTIDA Y LIVIANA)
  // ==========================================================================

  /**
   * Comprime y optimiza la fotografía tomada o subida a un tamaño proporcionado
   * garantizando que no se corte ningún número ni dial del medidor.
   * @param {File} file 
   * @param {number} maxSize Máxima dimensión (ancho o alto) en píxeles
   * @param {number} quality Calidad JPEG
   * @returns {Promise<string>}
   */
  function compressImage(file, maxSize = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('El archivo seleccionado no es una imagen válida'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Escalar proporcionalmente tanto para fotos horizontales como verticales
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Fondo blanco para evitar fondos oscuros en imágenes con transparencia
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

  // ==========================================================================
  // LÓGICA DE CÁLCULO Y GRUPOS DE COLOR
  // ==========================================================================

  /**
   * Determina si un departamento pertenece al grupo de Dpto 101 hasta 503
   */
  function isCyanGroup(dept) {
    if (!dept || !dept.name) return false;
    const name = dept.name.trim();
    if (/^tienda/i.test(name)) return false;
    const match = name.match(/^(?:dpto\.?\s*)?(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return num >= 101 && num <= 503;
    }
    return false;
  }

  /**
   * Devuelve la clase CSS correspondiente a la fila según su bloque
   */
  function getRowClass(dept, index) {
    if (isCyanGroup(dept)) {
      return 'row-cyan-group';
    }
    return (index % 2 === 0) ? 'row-neutral-even' : 'row-neutral-odd';
  }

  /**
   * Calcula el consumo y pago de una fila considerando excepciones (actual < anterior)
   */
  function calculateRow(prevReading, currReading, rate) {
    const prev = parseFloat(prevReading);
    const curr = parseFloat(currReading);

    const isPrevValid = !isNaN(prev) && prev >= 0;
    const isCurrValid = !isNaN(curr) && curr >= 0;

    if (!isPrevValid || !isCurrValid) {
      return {
        consumption: 0,
        payment: 0,
        isAlert: false,
        consumptionFormatted: '0.000',
        paymentFormatted: '0.00'
      };
    }

    let consumption = 0;
    let isAlert = false;

    if (curr < prev) {
      consumption = Math.abs(curr - prev);
      isAlert = true;
    } else {
      consumption = curr - prev;
      isAlert = false;
    }

    const currentRate = typeof rate === 'number' && rate >= 0 ? rate : 0;
    const payment = consumption * currentRate;

    return {
      consumption,
      payment,
      isAlert,
      consumptionFormatted: consumption.toFixed(3),
      paymentFormatted: payment.toFixed(2)
    };
  }

  /**
   * Genera el HTML de la celda de foto para una fila
   */
  function getPhotoCellHtml(dept) {
    if (dept.photo) {
      return `
        <div class="photo-preview-wrapper" title="Ver foto ampliada">
          <img src="${dept.photo}" alt="Foto ${escapeHtml(dept.name)}" class="photo-thumb btn-view-photo" />
          <button type="button" class="btn-remove-photo" title="Eliminar foto">✕</button>
        </div>
      `;
    }

    return `
      <label class="btn-photo-upload" title="Subir o tomar foto del medidor">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        Foto
        <input type="file" accept="image/*" capture="environment" class="file-photo-input" style="display:none;" />
      </label>
    `;
  }

  /**
   * Renderiza una fila individual dentro de la tabla
   */
  function createRowElement(dept, index) {
    const calc = calculateRow(dept.prev, dept.curr, state.rate);

    const tr = document.createElement('tr');
    tr.id = `row-${dept.id}`;
    tr.dataset.id = dept.id;
    
    tr.classList.add(getRowClass(dept, index));
    if (calc.isAlert) {
      tr.classList.add('row-alert');
    }

    const prevDisplay = dept.prev !== undefined && dept.prev !== '' 
      ? Number(dept.prev).toFixed(3) 
      : '0.000';
    const currDisplay = dept.curr !== undefined && dept.curr !== '' 
      ? Number(dept.curr).toFixed(3) 
      : '0.000';

    tr.innerHTML = `
      <td>
        <input 
          type="text" 
          class="table-input dept-name-input" 
          value="${escapeHtml(dept.name || '')}" 
          placeholder="Ej: Dpto 101"
          title="Nombre del departamento o tienda"
        />
      </td>
      <td>
        <div class="reading-cell-group">
          <input 
            type="number" 
            step="0.001" 
            min="0"
            class="table-input number-input reading-prev-input" 
            value="${prevDisplay}" 
            placeholder="0.000"
            title="Lectura del mes anterior en m³"
          />
          <input 
            type="date" 
            class="table-input date-row-input reading-prev-date-input" 
            value="${dept.datePrev || state.datePrev}" 
            title="Fecha de lectura anterior para este departamento"
          />
        </div>
      </td>
      <td>
        <div class="reading-cell-group">
          <input 
            type="number" 
            step="0.001" 
            min="0"
            class="table-input number-input reading-curr-input" 
            value="${currDisplay}" 
            placeholder="0.000"
            title="Lectura del mes actual en m³"
          />
          <input 
            type="date" 
            class="table-input date-row-input reading-curr-date-input" 
            value="${dept.dateCurr || state.dateCurr}" 
            title="Fecha de lectura actual para este departamento"
          />
        </div>
      </td>
      <td class="photo-cell" style="text-align: center;">
        ${getPhotoCellHtml(dept)}
      </td>
      <td>
        <div class="calculated-cell">
          <span class="consumption-value">${calc.consumptionFormatted} m³</span>
          ${calc.isAlert ? `
            <div class="alert-badge-container">
              <span class="alert-badge">⚠️ Verificar lectura</span>
              <div class="alert-tooltip">La lectura actual es menor que la anterior. Verifique posibles errores de tipeo o el medidor.</div>
            </div>
          ` : ''}
        </div>
      </td>
      <td>
        <div class="calculated-cell">
          <span class="payment-value">S/ ${calc.paymentFormatted}</span>
        </div>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-delete" title="Eliminar fila">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Eliminar
        </button>
      </td>
    `;

    return tr;
  }

  /**
   * Actualiza los cálculos y estilos de una fila existente en el DOM
   */
  function updateRowInDOM(rowTr, dept, index) {
    const calc = calculateRow(dept.prev, dept.curr, state.rate);

    if (calc.isAlert) {
      rowTr.classList.add('row-alert');
    } else {
      rowTr.classList.remove('row-alert');
    }

    if (typeof index === 'number') {
      rowTr.classList.remove('row-cyan-group', 'row-neutral-even', 'row-neutral-odd');
      rowTr.classList.add(getRowClass(dept, index));
    }

    // Actualizar celda de foto
    const photoCell = rowTr.querySelector('.photo-cell');
    if (photoCell) {
      photoCell.innerHTML = getPhotoCellHtml(dept);
    }

    // Actualizar consumo
    const consumptionCell = rowTr.children[4].querySelector('.calculated-cell');
    if (consumptionCell) {
      consumptionCell.innerHTML = `
        <span class="consumption-value">${calc.consumptionFormatted} m³</span>
        ${calc.isAlert ? `
          <div class="alert-badge-container">
            <span class="alert-badge">⚠️ Verificar lectura</span>
            <div class="alert-tooltip">La lectura actual es menor que la anterior. Verifique posibles errores de tipeo o el medidor.</div>
          </div>
        ` : ''}
      `;
    }

    // Actualizar pago
    const paymentCell = rowTr.children[5].querySelector('.payment-value');
    if (paymentCell) {
      paymentCell.textContent = `S/ ${calc.paymentFormatted}`;
    }
  }

  /**
   * Recalcula y actualiza los totales en tiempo real
   */
  function updateTotals() {
    let totalConsumption = 0;
    let totalPayment = 0;

    state.departments.forEach(dept => {
      const calc = calculateRow(dept.prev, dept.curr, state.rate);
      totalConsumption += calc.consumption;
      totalPayment += calc.payment;
    });

    elements.totalConsumption.textContent = `${totalConsumption.toFixed(3)} m³`;
    elements.totalPayment.textContent = `S/ ${totalPayment.toFixed(2)}`;

    const count = state.departments.length;
    elements.rowsCount.textContent = count === 1 
      ? '1 departamento registrado' 
      : `${count} departamentos registrados`;
  }

  /**
   * Renderiza la tabla completa
   */
  function renderTable() {
    elements.tableBody.innerHTML = '';
    state.departments.forEach((dept, index) => {
      elements.tableBody.appendChild(createRowElement(dept, index));
    });
    updateTotals();
  }

  /**
   * Agrega un nuevo departamento a la lista
   */
  function addNewDepartment() {
    const nextIndex = state.departments.length + 1;
    const newDept = {
      id: 'dept-' + Date.now(),
      name: `Dpto ${nextIndex}`,
      prev: 0,
      curr: 0,
      photo: null,
      datePrev: state.datePrev,
      dateCurr: state.dateCurr
    };

    state.departments.push(newDept);
    saveState();

    const tr = createRowElement(newDept, state.departments.length - 1);
    elements.tableBody.appendChild(tr);
    updateTotals();

    const nameInput = tr.querySelector('.dept-name-input');
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }

  /**
   * Elimina un departamento pidiendo confirmación previa
   */
  async function deleteDepartment(id) {
    const dept = state.departments.find(d => d.id === id);
    const deptName = dept && dept.name ? `"${dept.name}"` : 'este departamento';

    if (window.confirm(`¿Estás seguro de que deseas eliminar ${deptName}?`)) {
      state.departments = state.departments.filter(d => d.id !== id);
      await deletePhotoFromDB(id);
      saveState();

      const rowTr = document.getElementById(`row-${id}`);
      if (rowTr) {
        rowTr.remove();
      }
      updateTotals();
    }
  }

  /**
   * Elimina todas las fotos cargadas de todos los departamentos en la web
   */
  async function handleClearAllPhotos() {
    const hasPhotos = state.departments.some(d => !!d.photo);
    if (!hasPhotos) {
      alert('No hay fotografías de medidores para eliminar.');
      return;
    }

    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar todas las fotos de los medidores de una sola vez?\n\nEsta acción no se puede deshacer.'
    );

    if (confirmed) {
      state.departments.forEach(dept => {
        dept.photo = null;
      });
      await clearAllPhotosFromDB();
      saveState();
      renderTable();
    }
  }

  /**
   * Abre el modal para ver la foto del medidor ampliada
   */
  function openPhotoModal(dept) {
    if (!dept || !dept.photo) return;

    elements.modalTitle.textContent = `Medidor: ${dept.name}`;
    elements.modalImg.src = dept.photo;
    
    const currNum = (!isNaN(parseFloat(dept.curr)) && parseFloat(dept.curr) >= 0)
      ? parseFloat(dept.curr).toFixed(3)
      : '0.000';
    elements.modalCaption.textContent = `Lectura registrada: ${currNum} m³ | Periodo: ${state.period}`;

    elements.photoModal.style.display = 'flex';
  }

  /**
   * Cierra el modal de foto
   */
  function closePhotoModal() {
    elements.photoModal.style.display = 'none';
    elements.modalImg.src = '';
  }

  /**
   * Manejador de eventos delegado para inputs dentro de la tabla
   */
  function handleTableInput(e) {
    const target = e.target;
    const rowTr = target.closest('tr');
    if (!rowTr) return;

    const id = rowTr.dataset.id;
    const dept = state.departments.find(d => d.id === id);
    if (!dept) return;

    const index = state.departments.findIndex(d => d.id === id);

    if (target.classList.contains('dept-name-input')) {
      dept.name = target.value;
      updateRowInDOM(rowTr, dept, index);
    } else if (target.classList.contains('reading-prev-input')) {
      dept.prev = target.value === '' ? '' : parseFloat(target.value);
      updateRowInDOM(rowTr, dept, index);
      updateTotals();
    } else if (target.classList.contains('reading-curr-input')) {
      dept.curr = target.value === '' ? '' : parseFloat(target.value);
      updateRowInDOM(rowTr, dept, index);
      updateTotals();
    } else if (target.classList.contains('reading-prev-date-input')) {
      dept.datePrev = target.value;
      saveState();
    } else if (target.classList.contains('reading-curr-date-input')) {
      dept.dateCurr = target.value;
      saveState();
    }

    saveState();
  }

  /**
   * Manejador de cambios en tabla (subida de fotos y fechas individuales)
   */
  async function handleTableChange(e) {
    const target = e.target;

    // Cambio en fecha individual de fila
    if (target.classList.contains('reading-prev-date-input') || target.classList.contains('reading-curr-date-input')) {
      const rowTr = target.closest('tr');
      if (rowTr) {
        const id = rowTr.dataset.id;
        const dept = state.departments.find(d => d.id === id);
        if (dept) {
          if (target.classList.contains('reading-prev-date-input')) {
            dept.datePrev = target.value;
          } else {
            dept.dateCurr = target.value;
          }
          saveState();
        }
      }
      return;
    }

    if (target.classList.contains('file-photo-input') && target.files && target.files[0]) {
      const file = target.files[0];
      const rowTr = target.closest('tr');
      if (!rowTr) return;

      const id = rowTr.dataset.id;
      const dept = state.departments.find(d => d.id === id);
      if (!dept) return;

      const index = state.departments.findIndex(d => d.id === id);

      // Mostrar estado de carga visible
      const photoCell = rowTr.querySelector('.photo-cell');
      if (photoCell) {
        photoCell.innerHTML = `<span style="font-size:0.75rem; color:#0284c7; font-weight:700;">⏳ Cargando...</span>`;
      }

      try {
        const compressedDataUrl = await compressImage(file, 800, 0.75);
        dept.photo = compressedDataUrl;
        await savePhotoToDB(dept.id, compressedDataUrl);
        saveState();
        updateRowInDOM(rowTr, dept, index);
      } catch (err) {
        console.error('Error al procesar la foto del medidor', err);
        alert('No se pudo procesar la imagen seleccionada. Por favor intente con otra foto.');
        updateRowInDOM(rowTr, dept, index);
      } finally {
        // Limpiar el valor del input para permitir volver a subir el mismo archivo si es necesario
        target.value = '';
      }
    }
  }

  /**
   * Manejador de clics delegado para la tabla (eliminar, ver foto, quitar foto)
   */
  async function handleTableClick(e) {
    const rowTr = e.target.closest('tr');
    if (!rowTr) return;
    const id = rowTr.dataset.id;
    const dept = state.departments.find(d => d.id === id);
    if (!dept) return;
    const index = state.departments.findIndex(d => d.id === id);

    // Botón eliminar fila
    if (e.target.closest('.btn-delete')) {
      await deleteDepartment(id);
      return;
    }

    // Clic en miniatura de foto para ver ampliada
    if (e.target.closest('.btn-view-photo')) {
      openPhotoModal(dept);
      return;
    }

    // Botón para quitar foto subida
    if (e.target.closest('.btn-remove-photo')) {
      if (window.confirm(`¿Deseas quitar la foto del medidor de ${dept.name}?`)) {
        dept.photo = null;
        await deletePhotoFromDB(dept.id);
        saveState();
        updateRowInDOM(rowTr, dept, index);
      }
      return;
    }
  }

  /**
   * Manejador de cambio en la tarifa global
   */
  function handleRateChange() {
    const rawValue = elements.rateInput.value;
    const newRate = parseFloat(rawValue);

    if (!isNaN(newRate) && newRate >= 0) {
      state.rate = newRate;
      saveState();

      elements.tableBody.querySelectorAll('tr').forEach((tr, index) => {
        const id = tr.dataset.id;
        const dept = state.departments.find(d => d.id === id);
        if (dept) {
          updateRowInDOM(tr, dept, index);
        }
      });

      updateTotals();
    }
  }

  /**
   * Manejador de cambio en el periodo / mes de lectura
   */
  function handlePeriodChange() {
    state.period = elements.periodInput.value.trim() || DEFAULT_PERIOD;
    saveState();
  }

  /**
   * Manejador de cambio en la fecha global de lectura anterior
   */
  function handleGlobalDatePrevChange() {
    const val = elements.globalDatePrevInput.value;
    state.datePrev = val;
    state.departments.forEach(dept => {
      dept.datePrev = val;
    });
    saveState();
    elements.tableBody.querySelectorAll('.reading-prev-date-input').forEach(input => {
      input.value = val;
    });
    updateHeaderDateSubtexts();
  }

  /**
   * Manejador de cambio en la fecha global de lectura actual
   */
  function handleGlobalDateCurrChange() {
    const val = elements.globalDateCurrInput.value;
    state.dateCurr = val;
    state.departments.forEach(dept => {
      dept.dateCurr = val;
    });
    saveState();
    elements.tableBody.querySelectorAll('.reading-curr-date-input').forEach(input => {
      input.value = val;
    });
    updateHeaderDateSubtexts();
  }

  /**
   * Actualiza el texto de fecha en los encabezados de la tabla
   */
  function updateHeaderDateSubtexts() {
    if (elements.thDatePrevSubtext) {
      elements.thDatePrevSubtext.textContent = state.datePrev ? `(${formatDateDisplay(state.datePrev)})` : '';
    }
    if (elements.thDateCurrSubtext) {
      elements.thDateCurrSubtext.textContent = state.dateCurr ? `(${formatDateDisplay(state.dateCurr)})` : '';
    }
  }

  // ==========================================================================
  // EXPORTACIÓN A PDF CON ANEXO FOTOGRÁFICO DE ALTA RESOLUCIÓN (SIN CORTES)
  // ==========================================================================

  /**
   * Exporta directamente el reporte a archivo PDF:
   * - Tabla de consumo con membrete y colores oficiales
   * - Anexo Fotográfico con imágenes proporcionales completas que no se cortan
   */
  async function exportToPDF() {
    if (typeof html2pdf === 'undefined') {
      window.print();
      return;
    }

    const setButtonsLoading = (loading) => {
      const text = loading ? 'Generando PDF...' : 'Descargar PDF';
      if (elements.btnExportPdfTop) {
        elements.btnExportPdfTop.disabled = loading;
        elements.btnExportPdfTop.innerHTML = loading ? `⏳ ${text}` : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="12" y2="18"></line>
            <line x1="15" y1="15" x2="12" y2="18"></line>
          </svg> Descargar PDF`;
      }
      if (elements.btnExportPdfBottom) {
        elements.btnExportPdfBottom.disabled = loading;
        elements.btnExportPdfBottom.innerHTML = loading ? `⏳ Generando archivo...` : `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="12" y2="18"></line>
            <line x1="15" y1="15" x2="12" y2="18"></line>
          </svg> Descargar Reporte PDF`;
      }
    };

    setButtonsLoading(true);

    let totalConsumption = 0;
    let totalPayment = 0;

    // Generar filas de la tabla para el PDF con estilos en línea
    const rowsHtml = state.departments.map((dept, index) => {
      const calc = calculateRow(dept.prev, dept.curr, state.rate);
      totalConsumption += calc.consumption;
      totalPayment += calc.payment;

      const prevNum = (!isNaN(parseFloat(dept.prev)) && parseFloat(dept.prev) >= 0)
        ? parseFloat(dept.prev).toFixed(3)
        : '0.000';
      const currNum = (!isNaN(parseFloat(dept.curr)) && parseFloat(dept.curr) >= 0)
        ? parseFloat(dept.curr).toFixed(3)
        : '0.000';

      const isCyan = isCyanGroup(dept);
      let rowBg = '#ffffff';
      let borderLeft = 'border-left: 3.5px solid transparent;';

      if (calc.isAlert) {
        rowBg = '#fff1f2';
        borderLeft = 'border-left: 3.5px solid #b91c1c;';
      } else if (isCyan) {
        rowBg = '#e6f6fa'; // Fondo cian pastel derivado de #149DBF
        borderLeft = 'border-left: 3.5px solid #149DBF;';
      } else {
        // Bloque de 601 en adelante y tiendas: alternado suave
        rowBg = (index % 2 === 0) ? '#ffffff' : '#f8fafc';
      }

      const alertIndicator = calc.isAlert 
        ? `<span style="display:inline-block; margin-left:4px; font-size:8px; font-weight:700; color:#b91c1c; background:#fee2e2; padding:1px 4px; border-radius:3px;">⚠️ Verificar</span>`
        : '';

      const datePrevDisplay = formatDateDisplay(dept.datePrev || state.datePrev);
      const dateCurrDisplay = formatDateDisplay(dept.dateCurr || state.dateCurr);

      return `
        <tr style="background-color: ${rowBg}; ${borderLeft}">
          <td style="padding: 4px 7px; font-size: 9px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #cbd5e1;">${escapeHtml(dept.name)}</td>
          <td style="padding: 4px 7px; font-size: 9px; text-align: right; color: #334155; border-bottom: 1px solid #cbd5e1;">
            <div style="font-weight: 600;">${prevNum} m³</div>
            <div style="font-size: 7.5px; color: #64748b; margin-top: 1px;">${datePrevDisplay}</div>
          </td>
          <td style="padding: 4px 7px; font-size: 9px; text-align: right; color: #334155; border-bottom: 1px solid #cbd5e1;">
            <div style="font-weight: 600;">${currNum} m³</div>
            <div style="font-size: 7.5px; color: #64748b; margin-top: 1px;">${dateCurrDisplay}</div>
          </td>
          <td style="padding: 4px 7px; font-size: 9px; text-align: right; font-weight: 700; color: #0f3b6c; border-bottom: 1px solid #cbd5e1;">${calc.consumptionFormatted} m³ ${alertIndicator}</td>
          <td style="padding: 4px 7px; font-size: 9px; text-align: right; font-weight: 700; color: #047857; border-bottom: 1px solid #cbd5e1;">S/ ${calc.paymentFormatted}</td>
        </tr>
      `;
    }).join('');

    // Generar páginas para el Anexo Fotográfico (cuadrícula de 3 columnas x 4 filas = 12 fotos por página)
    const departmentsWithPhotos = state.departments.filter(d => !!d.photo);

    let photoAnnexHtml = '';
    if (departmentsWithPhotos.length > 0) {
      const PHOTOS_PER_ROW = 3;
      const ROWS_PER_PAGE = 4;
      const PHOTOS_PER_PAGE = PHOTOS_PER_ROW * ROWS_PER_PAGE; // 12 fotos por página
      const totalAnnexPages = Math.ceil(departmentsWithPhotos.length / PHOTOS_PER_PAGE);

      const annexPagesHtml = [];

      for (let p = 0; p < totalAnnexPages; p++) {
        const pagePhotos = departmentsWithPhotos.slice(p * PHOTOS_PER_PAGE, (p + 1) * PHOTOS_PER_PAGE);
        
        // Agrupar en filas de 3
        const rows = [];
        for (let r = 0; r < pagePhotos.length; r += PHOTOS_PER_ROW) {
          rows.push(pagePhotos.slice(r, r + PHOTOS_PER_ROW));
        }

        const rowsHtmlForPage = rows.map(row => {
          const cellsHtml = row.map(dept => {
            const currNum = (!isNaN(parseFloat(dept.curr)) && parseFloat(dept.curr) >= 0)
              ? parseFloat(dept.curr).toFixed(3)
              : '0.000';
            return `
              <td style="width: 33.333%; vertical-align: top; padding: 3px; box-sizing: border-box;">
                <div style="border: 1.5px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff;">
                  <!-- Cabecera de la foto con color #1D3E85 y nombre Dpto/Tienda en grande -->
                  <table style="width: 100%; border-collapse: collapse; background-color: #1D3E85; color: #ffffff;">
                    <tr>
                      <td style="padding: 3.5px 5px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #ffffff; text-align: left;">
                        ${escapeHtml(dept.name)}
                      </td>
                      <td style="padding: 3.5px 5px; font-size: 8px; font-weight: 700; color: #dbeafe; text-align: right; white-space: nowrap;">
                        ${currNum} m³ &bull; ${formatDateDisplay(dept.dateCurr || state.dateCurr)}
                      </td>
                    </tr>
                  </table>
                  <!-- Foto del medidor -->
                  <div style="padding: 3px; background: #f8fafc; text-align: center;">
                    <img src="${dept.photo}" alt="Medidor ${escapeHtml(dept.name)}" width="220" style="display: block; width: 100%; border-radius: 2px;" />
                  </div>
                </div>
              </td>
            `;
          }).join('');

          // Rellenar celdas vacías si la fila no completa las 3 columnas
          const emptyCellsCount = PHOTOS_PER_ROW - row.length;
          let emptyCellsHtml = '';
          for (let e = 0; e < emptyCellsCount; e++) {
            emptyCellsHtml += `<td style="width: 33.333%; padding: 3px;"></td>`;
          }

          return `
            <tr style="page-break-inside: avoid; break-inside: avoid;">
              ${cellsHtml}
              ${emptyCellsHtml}
            </tr>
          `;
        }).join('');

        annexPagesHtml.push(`
          <div style="page-break-before: always; break-before: page; margin-top: 10px;">
            <div style="border-bottom: 2px solid #1D3E85; padding-bottom: 4px; margin-bottom: 8px; display: table; width: 100%;">
              <div style="display: table-cell; vertical-align: middle;">
                <h2 style="margin: 0; font-size: 12px; color: #1D3E85; font-weight: 800; text-transform: uppercase;">
                  ANEXO FOTOGRÁFICO: EVIDENCIA DE MEDIDORES
                </h2>
                <p style="margin: 1px 0 0 0; font-size: 8px; color: #64748b;">
                  Periodo: <strong>${escapeHtml(state.period)}</strong> | Multifamiliar ${BUILDING_NAME} ${totalAnnexPages > 1 ? `(Página ${p + 1} de ${totalAnnexPages})` : ''}
                </p>
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 0; table-layout: fixed;">
              <tbody>
                ${rowsHtmlForPage}
              </tbody>
            </table>
          </div>
        `);
      }

      photoAnnexHtml = annexPagesHtml.join('');
    }

    const fechaHoy = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const reportContainer = document.createElement('div');
    reportContainer.style.padding = '14px';
    reportContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    reportContainer.style.color = '#0f172a';
    reportContainer.style.backgroundColor = '#ffffff';

    reportContainer.innerHTML = `
      <!-- Encabezado formal con nombre del edificio -->
      <div style="border-bottom: 2.5px solid #0284c7; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">MULTIFAMILIAR</div>
          <h1 style="margin: 1px 0 0 0; font-size: 17px; color: #0f3b6c; font-weight: 800; letter-spacing: -0.3px;">${BUILDING_NAME.toUpperCase()}</h1>
          <p style="margin: 3px 0 0 0; font-size: 9.5px; color: #475569;">Reporte de Consumo de Agua y Liquidación de Cobranza</p>
        </div>
        <div style="text-align: right; font-size: 9px; color: #334155;">
          <div><strong>Periodo / Mes:</strong> <span style="color:#0f3b6c; font-weight:bold;">${escapeHtml(state.period)}</span></div>
          <div style="margin-top: 2px;"><strong>Tarifa por m³:</strong> S/ ${state.rate.toFixed(2)}</div>
          <div style="margin-top: 2px;"><strong>Fechas de toma:</strong> ${formatDateDisplay(state.datePrev)} &rarr; ${formatDateDisplay(state.dateCurr)}</div>
          <div style="margin-top: 2px;"><strong>Fecha de emisión:</strong> ${fechaHoy}</div>
        </div>
      </div>

      <!-- Tabla de consumo con cabecera #1D3E85 -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
          <tr style="background-color: #1D3E85; color: #ffffff;">
            <th style="padding: 5px 7px; font-size: 8.5px; text-align: left; text-transform: uppercase; font-weight: 700; width: 28%; color: #ffffff;">Departamento / Tienda</th>
            <th style="padding: 5px 7px; font-size: 8.5px; text-align: right; text-transform: uppercase; font-weight: 700; width: 18%; color: #ffffff;">
              Lectura Anterior
              ${state.datePrev ? `<div style="font-size: 7px; font-weight: normal; opacity: 0.9; text-transform: none;">(${formatDateDisplay(state.datePrev)})</div>` : ''}
            </th>
            <th style="padding: 5px 7px; font-size: 8.5px; text-align: right; text-transform: uppercase; font-weight: 700; width: 18%; color: #ffffff;">
              Lectura Actual
              ${state.dateCurr ? `<div style="font-size: 7px; font-weight: normal; opacity: 0.9; text-transform: none;">(${formatDateDisplay(state.dateCurr)})</div>` : ''}
            </th>
            <th style="padding: 5px 7px; font-size: 8.5px; text-align: right; text-transform: uppercase; font-weight: 700; width: 18%; color: #ffffff;">Consumo (m³)</th>
            <th style="padding: 5px 7px; font-size: 8.5px; text-align: right; text-transform: uppercase; font-weight: 700; width: 18%; color: #ffffff;">Pago (S/)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #e6f6fa; border-top: 2.5px solid #1D3E85;">
            <td colspan="3" style="padding: 6px 7px; font-size: 10px; font-weight: 800; color: #1D3E85; text-align: right;">TOTALES GENERALES:</td>
            <td style="padding: 6px 7px; font-size: 10px; font-weight: 800; color: #1D3E85; text-align: right;">${totalConsumption.toFixed(3)} m³</td>
            <td style="padding: 6px 7px; font-size: 10px; font-weight: 800; color: #047857; text-align: right;">S/ ${totalPayment.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Resumen Destacado al final de la tabla -->
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
        <div style="border: 1.5px solid #bae6fd; background-color: #f0f9ff; padding: 5px 12px; border-radius: 6px; text-align: right;">
          <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Consumo de Todo</div>
          <div style="font-size: 12.5px; font-weight: 800; color: #0f3b6c;">${totalConsumption.toFixed(3)} m³</div>
        </div>
        <div style="border: 1.5px solid #a7f3d0; background-color: #ecfdf5; padding: 5px 12px; border-radius: 6px; text-align: right;">
          <div style="font-size: 8px; color: #047857; font-weight: 700; text-transform: uppercase;">Total a Cobrar</div>
          <div style="font-size: 12.5px; font-weight: 800; color: #047857;">S/ ${totalPayment.toFixed(2)}</div>
        </div>
      </div>

      <!-- Anexo Fotográfico si hay imágenes cargadas -->
      ${photoAnnexHtml}
    `;

    const periodClean = state.period.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const opt = {
      margin: [7, 7, 7, 7],
      filename: `reporte-agua-el-alamo-etapa-1-${periodClean}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportContainer).save().then(() => {
      setButtonsLoading(false);
    }).catch((err) => {
      console.error('Error al generar PDF:', err);
      setButtonsLoading(false);
      window.print();
    });
  }

  /**
   * Utilidad de escape HTML
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================

  async function init() {
    await loadState();
    elements.rateInput.value = state.rate.toFixed(2);
    elements.periodInput.value = state.period;

    if (elements.globalDatePrevInput) {
      elements.globalDatePrevInput.value = state.datePrev;
      elements.globalDatePrevInput.addEventListener('input', handleGlobalDatePrevChange);
      elements.globalDatePrevInput.addEventListener('change', handleGlobalDatePrevChange);
    }

    if (elements.globalDateCurrInput) {
      elements.globalDateCurrInput.value = state.dateCurr;
      elements.globalDateCurrInput.addEventListener('input', handleGlobalDateCurrChange);
      elements.globalDateCurrInput.addEventListener('change', handleGlobalDateCurrChange);
    }

    updateHeaderDateSubtexts();

    renderTable();

    // Event Listeners
    elements.rateInput.addEventListener('input', handleRateChange);
    elements.rateInput.addEventListener('change', handleRateChange);

    elements.periodInput.addEventListener('input', handlePeriodChange);
    elements.periodInput.addEventListener('change', handlePeriodChange);

    elements.tableBody.addEventListener('input', handleTableInput);
    elements.tableBody.addEventListener('change', handleTableChange);
    elements.tableBody.addEventListener('click', handleTableClick);

    elements.btnAddRow.addEventListener('click', addNewDepartment);

    if (elements.btnClearAllPhotos) {
      elements.btnClearAllPhotos.addEventListener('click', handleClearAllPhotos);
    }

    if (elements.btnExportPdfTop) {
      elements.btnExportPdfTop.addEventListener('click', exportToPDF);
    }
    if (elements.btnExportPdfBottom) {
      elements.btnExportPdfBottom.addEventListener('click', exportToPDF);
    }

    // Modal de fotos
    if (elements.btnCloseModal) {
      elements.btnCloseModal.addEventListener('click', closePhotoModal);
    }
    if (elements.modalBackdrop) {
      elements.modalBackdrop.addEventListener('click', closePhotoModal);
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.photoModal.style.display !== 'none') {
        closePhotoModal();
      }
    });
  }

  // Arrancar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
