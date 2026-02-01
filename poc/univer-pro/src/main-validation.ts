import { setupUniverStandalone } from './setup-univer-standalone'
import type { FUniver } from '@univerjs/presets'

let univerAPI: FUniver

// Performance tracking
let performanceMetrics = {
  loadTime: 0,
  renderTime: 0,
  memoryStart: 0,
  memoryEnd: 0,
  rowCount: 0,
}

function main() {
  console.log('[Validation POC] Initializing Univer Pro standalone...')
  
  univerAPI = setupUniverStandalone()
  window.univerAPI = univerAPI

  univerAPI.addEvent(univerAPI.Event.LifeCycleChanged, ({ stage }) => {
    if (stage === univerAPI.Enum.LifecycleStages.Rendered) {
      console.log('[Validation POC] Univer Pro rendered successfully')
      setupValidationTests()
    }
  })
}

function setupValidationTests() {
  // Task 2: Excel Import Test
  const fileInput = document.getElementById('excelFile') as HTMLInputElement
  fileInput?.addEventListener('change', handleExcelImport)

  // Task 4: Selection Events Test
  const testSelectionBtn = document.getElementById('testSelectionBtn')
  testSelectionBtn?.addEventListener('click', setupSelectionListener)

  const clearSelectionBtn = document.getElementById('clearSelectionBtn')
  clearSelectionBtn?.addEventListener('click', clearSelectionLog)

  // Task 5: Performance Benchmark
  const testPerformanceBtn = document.getElementById('testPerformanceBtn')
  testPerformanceBtn?.addEventListener('click', runPerformanceBenchmark)

  // Task 3: Custom Renderers Test
  const testStatusBtn = document.getElementById('testStatusBtn')
  testStatusBtn?.addEventListener('click', testStatusFormatting)

  console.log('[Validation POC] All test handlers registered')
}

// Task 2: Excel Import Testing
async function handleExcelImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return

  const resultsDiv = document.getElementById('importResults')
  if (!resultsDiv) return

  resultsDiv.classList.remove('hidden', 'success', 'error')
  resultsDiv.textContent = `Importing: ${file.name} (${formatBytes(file.size)})...`

  const startTime = performance.now()

  try {
    // Check if Univer Pro has native importXLSXToSnapshotAsync
    if (typeof univerAPI.importXLSXToSnapshotAsync === 'function') {
      const arrayBuffer = await file.arrayBuffer()
      const snapshot = await univerAPI.importXLSXToSnapshotAsync(arrayBuffer)
      
      const importTime = performance.now() - startTime
      
      univerAPI.createWorkbook(snapshot)
      
      resultsDiv.classList.add('success')
      resultsDiv.innerHTML = `
✅ Native XLSX Import Successful!
File: ${file.name}
Size: ${formatBytes(file.size)}
Time: ${importTime.toFixed(2)}ms
Method: importXLSXToSnapshotAsync
      `.trim()
      
      console.log('[Validation] Native import successful:', { file, time: importTime })
    } else {
      // Fallback: Try to use any available import method
      resultsDiv.classList.add('error')
      resultsDiv.innerHTML = `
⚠️ Native XLSX import not available in this build
API: importXLSXToSnapshotAsync not found
Note: This feature may require Univer Pro license/server
      `.trim()
      
      console.warn('[Validation] Native import not available')
    }
  } catch (error) {
    const importTime = performance.now() - startTime
    resultsDiv.classList.add('error')
    resultsDiv.innerHTML = `
❌ Import Failed
File: ${file.name}
Time: ${importTime.toFixed(2)}ms
Error: ${error instanceof Error ? error.message : String(error)}
    `.trim()
    
    console.error('[Validation] Import failed:', error)
  }
}

// Task 4: Selection Events Testing
function setupSelectionListener() {
  const resultsDiv = document.getElementById('selectionResults')
  if (!resultsDiv) return

  resultsDiv.classList.remove('hidden')
  
  // Check if onSelectionChange exists
  if (typeof univerAPI.onSelectionChange === 'function') {
    univerAPI.onSelectionChange((selection: any) => {
      const timestamp = new Date().toLocaleTimeString()
      const logEntry = `[${timestamp}] Selection changed: ${JSON.stringify(selection, null, 2)}`
      
      resultsDiv.textContent = logEntry + '\n\n' + (resultsDiv.textContent || '')
      resultsDiv.scrollTop = 0
      
      console.log('[Validation] Selection event:', selection)
    })
    
    resultsDiv.textContent = '✅ Selection listener active. Click on cells to see events.'
  } else {
    // Try alternative APIs
    resultsDiv.textContent = '⚠️ onSelectionChange not found. Trying alternative listeners...'
    
    // Try using the general event system
    univerAPI.addEvent(univerAPI.Event.SelectionChanged, (payload: any) => {
      const timestamp = new Date().toLocaleTimeString()
      const logEntry = `[${timestamp}] Selection via Event API: ${JSON.stringify(payload, null, 2)}`
      
      resultsDiv.textContent = logEntry + '\n\n' + (resultsDiv.textContent || '')
      resultsDiv.scrollTop = 0
    })
  }
}

function clearSelectionLog() {
  const resultsDiv = document.getElementById('selectionResults')
  if (resultsDiv) {
    resultsDiv.textContent = ''
  }
}

// Task 3: Custom Cell Renderers / Status Formatting
async function testStatusFormatting() {
  const resultsDiv = document.getElementById('rendererResults')
  if (!resultsDiv) return

  resultsDiv.classList.remove('hidden')
  resultsDiv.textContent = 'Testing conditional formatting for status indicators...'

  try {
    const workbook = univerAPI.getActiveWorkbook()
    if (!workbook) {
      throw new Error('No active workbook')
    }

    const sheet = workbook.getActiveSheet()
    if (!sheet) {
      throw new Error('No active sheet')
    }

    // Add sample data with status values
    const statusValues = ['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS']
    
    for (let i = 0; i < 10; i++) {
      const status = statusValues[i % statusValues.length]
      sheet.getRange(i + 1, 1).setValue(status)
    }

    // Try to apply conditional formatting
    // Note: Actual API may vary, this is a test
    const range = sheet.getRange(1, 1, 10, 1)
    
    // Check if conditional formatting API exists
    if (typeof sheet.setConditionalFormatting === 'function') {
      await sheet.setConditionalFormatting({
        ranges: [{ startRow: 0, endRow: 10, startColumn: 0, endColumn: 1 }],
        rules: [
          {
            type: 'equalTo',
            value: 'APPROVED',
            style: { bg: { rgb: '22c55e' } } // Green
          },
          {
            type: 'equalTo', 
            value: 'REJECTED',
            style: { bg: { rgb: 'ef4444' } } // Red
          },
          {
            type: 'equalTo',
            value: 'PENDING',
            style: { bg: { rgb: 'f59e0b' } } // Orange
          }
        ]
      })
      
      resultsDiv.classList.add('success')
      resultsDiv.innerHTML = `
✅ Conditional formatting applied!
Type: Cell background colors by status
Cells: A1:A10
Status colors: Green (APPROVED), Red (REJECTED), Orange (PENDING)
Note: This uses conditional formatting as canvas grids don't support DOM renderers
      `.trim()
    } else {
      // Check what APIs are available
      const availableAPIs = Object.keys(sheet).filter(k => typeof (sheet as any)[k] === 'function')
      
      resultsDiv.classList.add('error')
      resultsDiv.innerHTML = `
⚠️ Conditional formatting API not found
Available sheet methods: ${availableAPIs.slice(0, 10).join(', ')}...

Custom renderers in canvas-based grids:
❌ Cannot use React components directly
✅ Can use conditional formatting (background colors)
✅ Can use data validation dropdowns
⚠️ Custom canvas drawing requires plugin development
      `.trim()
    }
  } catch (error) {
    resultsDiv.classList.add('error')
    resultsDiv.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}

// Task 5: Performance Benchmark
async function runPerformanceBenchmark() {
  const resultsDiv = document.getElementById('performanceResults')
  if (!resultsDiv) return

  resultsDiv.classList.remove('hidden')
  
  // Update UI
  document.getElementById('loadTime')!.textContent = 'Testing...'
  document.getElementById('renderTime')!.textContent = 'Testing...'
  document.getElementById('memoryUsage')!.textContent = 'Testing...'
  document.getElementById('rowCount')!.textContent = 'Testing...'

  const rowCount = 500
  const colCount = 20

  // Record start metrics
  performanceMetrics.memoryStart = (performance as any).memory?.usedJSHeapSize || 0
  const loadStart = performance.now()

  try {
    const workbook = univerAPI.getActiveWorkbook()
    if (!workbook) {
      throw new Error('No active workbook')
    }

    const sheet = workbook.getActiveSheet()
    if (!sheet) {
      throw new Error('No active sheet')
    }

    // Generate test data
    const testData: any[][] = []
    for (let row = 0; row < rowCount; row++) {
      const rowData: any[] = []
      for (let col = 0; col < colCount; col++) {
        if (col === 0) {
          rowData.push(`Row ${row + 1}`)
        } else if (col === 1) {
          const statuses = ['PENDING', 'APPROVED', 'REJECTED']
          rowData.push(statuses[row % 3])
        } else {
          rowData.push(Math.floor(Math.random() * 1000))
        }
      }
      testData.push(rowData)
    }

    const renderStart = performance.now()
    
    // Set values
    const range = sheet.getRange(1, 1, rowCount, colCount)
    await range.setValues(testData)

    const renderEnd = performance.now()
    const loadEnd = renderEnd

    // Record end metrics
    performanceMetrics.memoryEnd = (performance as any).memory?.usedJSHeapSize || 0
    performanceMetrics.loadTime = loadEnd - loadStart
    performanceMetrics.renderTime = renderEnd - renderStart
    performanceMetrics.rowCount = rowCount

    const memoryDelta = performanceMetrics.memoryEnd - performanceMetrics.memoryStart
    const memoryDeltaMB = memoryDelta > 0 ? (memoryDelta / 1024 / 1024).toFixed(2) : 'N/A'

    // Update UI with results
    document.getElementById('loadTime')!.textContent = `${performanceMetrics.loadTime.toFixed(2)}ms`
    document.getElementById('renderTime')!.textContent = `${performanceMetrics.renderTime.toFixed(2)}ms`
    document.getElementById('memoryUsage')!.textContent = `${memoryDeltaMB}MB`
    document.getElementById('rowCount')!.textContent = `${rowCount}`

    console.log('[Validation] Benchmark complete:', performanceMetrics)

  } catch (error) {
    document.getElementById('loadTime')!.textContent = 'Error'
    document.getElementById('renderTime')!.textContent = 'Error'
    document.getElementById('memoryUsage')!.textContent = 'Error'
    document.getElementById('rowCount')!.textContent = 'Error'
    
    console.error('[Validation] Benchmark failed:', error)
  }
}

// Utility function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Expose to window for debugging
;(window as any).validationPOC = {
  univerAPI,
  performanceMetrics,
  handleExcelImport,
  setupSelectionListener,
  testStatusFormatting,
  runPerformanceBenchmark,
}

main()
