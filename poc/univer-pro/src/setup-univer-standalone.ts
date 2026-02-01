import {
  createUniver,
  defaultTheme,
  LocaleType,
  LogLevel,
  mergeLocales,
  UniverInstanceType,
} from '@univerjs/presets'

import { CalculationMode, UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core'
import sheetsCoreEnUs from '@univerjs/presets/preset-sheets-core/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-core.css'

import { UniverSheetsAdvancedPreset } from '@univerjs/presets/preset-sheets-advanced'
import sheetsAdvancedEnUs from '@univerjs/presets/preset-sheets-advanced/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-advanced.css'

import { UniverSheetsThreadCommentPreset } from '@univerjs/presets/preset-sheets-thread-comment'
import sheetsThreadCommentEnUs from '@univerjs/presets/preset-sheets-thread-comment/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-thread-comment.css'

import { UniverSheetsConditionalFormattingPreset } from '@univerjs/presets/preset-sheets-conditional-formatting'
import sheetsConditionalFormattingEnUs from '@univerjs/presets/preset-sheets-conditional-formatting/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-conditional-formatting.css'

import { UniverSheetsDataValidationPreset } from '@univerjs/presets/preset-sheets-data-validation'
import sheetsDataValidationEnUs from '@univerjs/presets/preset-sheets-data-validation/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-data-validation.css'

import { UniverSheetsDrawingPreset } from '@univerjs/presets/preset-sheets-drawing'
import sheetsDrawingEnUs from '@univerjs/presets/preset-sheets-drawing/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-drawing.css'

import { UniverSheetsFilterPreset } from '@univerjs/presets/preset-sheets-filter'
import sheetsFilterEnUs from '@univerjs/presets/preset-sheets-filter/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-filter.css'

import { UniverSheetsFindReplacePreset } from '@univerjs/presets/preset-sheets-find-replace'
import sheetsFindReplaceEnUs from '@univerjs/presets/preset-sheets-find-replace/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-find-replace.css'

import { UniverSheetsHyperLinkPreset } from '@univerjs/presets/preset-sheets-hyper-link'
import sheetsHyperLinkEnUs from '@univerjs/presets/preset-sheets-hyper-link/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-hyper-link.css'

import { UniverSheetsSortPreset } from '@univerjs/presets/preset-sheets-sort'
import sheetsSortEnUs from '@univerjs/presets/preset-sheets-sort/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-sort.css'

import { UniverSheetsNotePreset } from '@univerjs/presets/preset-sheets-note'
import sheetsNoteEnUs from '@univerjs/presets/preset-sheets-note/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-note.css'

import workerURL from './worker.ts?worker&url'

export function setupUniverStandalone() {
  const { univerAPI, univer } = createUniver({
    locale: LocaleType.EN_US,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        sheetsCoreEnUs,
        sheetsAdvancedEnUs,
        sheetsThreadCommentEnUs,
        sheetsConditionalFormattingEnUs,
        sheetsDataValidationEnUs,
        sheetsDrawingEnUs,
        sheetsFilterEnUs,
        sheetsFindReplaceEnUs,
        sheetsHyperLinkEnUs,
        sheetsSortEnUs,
        sheetsNoteEnUs,
      ),
    },
    logLevel: LogLevel.VERBOSE,
    theme: defaultTheme,
    presets: [
      UniverSheetsCorePreset({
        container: 'univer',
        header: true,
        workerURL: new Worker(new URL(workerURL, import.meta.url), {
          type: 'module',
        }),
        formula: {
          initialFormulaComputing: CalculationMode.FORCED
        }
      }),
      UniverSheetsDrawingPreset({
        collaboration: false,
      }),
      UniverSheetsAdvancedPreset({
        useWorker: true,
        // Standalone mode - no server required for basic testing
        universerEndpoint: '',
        license: '', // Empty license for testing (will show watermark)
      }),
      UniverSheetsThreadCommentPreset({
        collaboration: false,
      }),
      UniverSheetsConditionalFormattingPreset(),
      UniverSheetsDataValidationPreset(),
      UniverSheetsFilterPreset(),
      UniverSheetsFindReplacePreset(),
      UniverSheetsSortPreset(),
      UniverSheetsNotePreset(),
      UniverSheetsHyperLinkPreset(),
    ],
  })

  // Create a blank workbook
  univerAPI.createWorkbook({
    id: 'test-workbook',
    name: 'Test Workbook',
    locale: LocaleType.EN_US,
  })

  return univerAPI
}
