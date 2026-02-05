import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import logger from '../../utils/logger';

/**
 * Template Renderer Service
 *
 * Handles Handlebars template compilation and rendering for emails
 */
export class TemplateRendererService {
    private templatesDir: string;
    private layoutsDir: string;
    private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
    private cacheEnabled: boolean;

    constructor() {
        this.templatesDir = path.join(__dirname, '../../../../templates/emails');
        this.layoutsDir = path.join(this.templatesDir, 'layouts');
        this.cacheEnabled = process.env.NODE_ENV === 'production';

        logger.info(`📧 Template Renderer initialized`);
        logger.info(`   Templates directory: ${this.templatesDir}`);
        logger.info(`   Cache enabled: ${this.cacheEnabled}`);
    }

    /**
     * Render a template with data
     * @param templateName Name of the template file (without .hbs extension)
     * @param data Data to pass to the template
     * @returns Rendered HTML string
     */
    async renderTemplate(templateName: string, data: any): Promise<string> {
        try {
            logger.info(`[TemplateRenderer] Rendering template: ${templateName}`);
            logger.info(`[TemplateRenderer] Input data:`, JSON.stringify(data, null, 2));

            // Check cache first
            const cacheKey = templateName;
            if (this.cacheEnabled && this.templateCache.has(cacheKey)) {
                logger.info(`[TemplateRenderer] Using cached template for: ${templateName}`);
                const template = this.templateCache.get(cacheKey)!;
                const result = template(data);
                logger.info(
                    `[TemplateRenderer] Cached render complete. Output length: ${result.length}`
                );
                return result;
            }

            // Load and compile template
            const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
            logger.info(`[TemplateRenderer] Loading template from: ${templatePath}`);
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            logger.info(
                `[TemplateRenderer] Template content loaded. Length: ${templateContent.length}`
            );

            // Load base layout
            const layoutPath = path.join(this.layoutsDir, 'base.hbs');
            const layoutContent = await fs.readFile(layoutPath, 'utf-8');

            // Compile layout
            const layoutTemplate = Handlebars.compile(layoutContent);

            // Compile content template
            const contentTemplate = Handlebars.compile(templateContent);

            // Render content
            logger.info(
                `[TemplateRenderer] Rendering content with data:`,
                JSON.stringify(data, null, 2)
            );
            const renderedContent = contentTemplate(data);
            logger.info(`[TemplateRenderer] Content rendered. Length: ${renderedContent.length}`);
            logger.info(
                `[TemplateRenderer] Content preview (first 300 chars): ${renderedContent.substring(0, 300)}`
            );

            // Render with layout
            const finalData = {
                ...data,
                body: renderedContent,
                year: new Date().getFullYear(),
            };
            logger.info(
                `[TemplateRenderer] Rendering layout with final data:`,
                JSON.stringify(finalData, null, 2)
            );
            const finalHtml = layoutTemplate(finalData);
            logger.info(`[TemplateRenderer] Final HTML rendered. Length: ${finalHtml.length}`);

            // Cache the compiled template if caching is enabled.
            // Store a rendering function that renders the content template
            // into the layout so subsequent renders still include `body`.
            if (this.cacheEnabled) {
                const cachedRenderer = (d: any) => {
                    const content = contentTemplate(d);
                    return layoutTemplate({ ...d, body: content, year: new Date().getFullYear() });
                };
                this.templateCache.set(
                    cacheKey,
                    cachedRenderer as unknown as HandlebarsTemplateDelegate
                );
                logger.info(`[TemplateRenderer] Template cached for: ${templateName}`);
            }

            return finalHtml;
        } catch (error) {
            logger.error(`[TemplateRenderer] Failed to render template: ${templateName}`, error);
            throw new Error(`Template rendering failed: ${templateName}`);
        }
    }

    /**
     * Clear the template cache
     * Useful for development when templates change
     */
    clearCache(): void {
        this.templateCache.clear();
        logger.info('Template cache cleared');
    }

    /**
     * Register a Handlebars helper
     * @param name Helper name
     * @param fn Helper function
     */
    registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
        Handlebars.registerHelper(name, fn);
    }

    /**
     * Register a Handlebars partial
     * @param name Partial name
     * @param template Partial template string
     */
    registerPartial(name: string, template: string): void {
        Handlebars.registerPartial(name, template);
    }
}

// Export singleton instance
export const templateRenderer = new TemplateRendererService();
