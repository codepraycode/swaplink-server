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
            // Check cache first
            const cacheKey = templateName;
            if (this.cacheEnabled && this.templateCache.has(cacheKey)) {
                const template = this.templateCache.get(cacheKey)!;
                return template(data);
            }

            // Load and compile template
            const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
            const templateContent = await fs.readFile(templatePath, 'utf-8');

            // Load base layout
            const layoutPath = path.join(this.layoutsDir, 'base.hbs');
            const layoutContent = await fs.readFile(layoutPath, 'utf-8');

            // Compile layout
            const layoutTemplate = Handlebars.compile(layoutContent);

            // Compile content template
            const contentTemplate = Handlebars.compile(templateContent);

            // Render content
            const renderedContent = contentTemplate(data);

            // Render with layout
            const finalHtml = layoutTemplate({
                ...data,
                body: renderedContent,
                year: new Date().getFullYear(),
            });

            // Cache the compiled template if caching is enabled
            if (this.cacheEnabled) {
                const compiledTemplate = Handlebars.compile(layoutContent);
                this.templateCache.set(cacheKey, compiledTemplate);
            }

            return finalHtml;
        } catch (error) {
            logger.error(`Failed to render template: ${templateName}`, error);
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
