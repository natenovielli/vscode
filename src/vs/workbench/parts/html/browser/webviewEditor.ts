/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { BaseWebviewEditor } from 'vs/workbench/browser/parts/editor/webviewEditor';
import { IStorageService } from 'vs/platform/storage/common/storage';

import { IContextKey, RawContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';

import { Webview } from './webview';
import { Builder } from 'vs/base/browser/builder';

/**  A context key that is set when a webview editor has focus. */
export const KEYBINDING_CONTEXT_WEBVIEWEDITOR_FOCUS = new RawContextKey<boolean>('webviewEditorFocus', false);
/**  A context key that is set when the find widget find input in webview editor webview is focused. */
export const KEYBINDING_CONTEXT_WEBVIEWEDITOR_FIND_WIDGET_INPUT_FOCUSED = new RawContextKey<boolean>('webviewEditorFindWidgetInputFocused', false);
/**  A context key that is set when the find widget in a webview is visible. */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE = new RawContextKey<boolean>('webviewFindWidgetVisible', false);

/**
 * This class is only intended to be subclassed and not instantiated.
 */
export abstract class WebviewEditor extends BaseWebviewEditor {

	protected _webviewFocusContextKey: IContextKey<boolean>;
	protected _webview: Webview;
	protected content: HTMLElement;
	protected contextKey: IContextKey<boolean>;
	protected findWidgetVisible: IContextKey<boolean>;
	protected findInputFocusContextKey: IContextKey<boolean>;

	constructor(
		id: string,
		telemetryService: ITelemetryService,
		themeService: IThemeService,
		storageService: IStorageService,
		contextKeyService: IContextKeyService,
	) {
		super(id, telemetryService, themeService, storageService);
		if (contextKeyService) {
			this.contextKey = KEYBINDING_CONTEXT_WEBVIEWEDITOR_FOCUS.bindTo(contextKeyService);
			this.findInputFocusContextKey = KEYBINDING_CONTEXT_WEBVIEWEDITOR_FIND_WIDGET_INPUT_FOCUSED.bindTo(contextKeyService);
			this.findWidgetVisible = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.bindTo(contextKeyService);
		}
	}

	public showFind() {
		if (this._webview) {
			this._webview.showFind();
			this.findWidgetVisible.set(true);
		}
	}

	public hideFind() {
		this.findWidgetVisible.reset();
		if (this._webview) {
			this._webview.hideFind();
		}
	}

	public showNextFindTerm() {
		if (this._webview) {
			this._webview.showNextFindTerm();
		}
	}

	public showPreviousFindTerm() {
		if (this._webview) {
			this._webview.showPreviousFindTerm();
		}
	}

	public updateStyles() {
		super.updateStyles();
		if (this._webview) {
			this._webview.style(this.themeService.getTheme());
		}
	}

	public get isWebviewEditor() {
		return true;
	}

	protected abstract createEditor(parent: Builder): void;
}

