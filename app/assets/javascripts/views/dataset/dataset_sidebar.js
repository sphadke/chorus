chorus.views.DatasetSidebar = chorus.views.Sidebar.extend({
    constructorName: "DatasetSidebarView",
    templateName: "dataset_sidebar",

    events: {
        "click .no_credentials a.add_credentials": "launchAddCredentialsDialog",
        "click .actions .associate": "launchAssociateWithWorkspaceDialog",
        "click .multiple_selection .associate": "launchAssociateMultipleWithWorkspaceDialog",
        "click .dataset_preview": "launchDatasetPreviewDialog",
        "click .actions a.analyze" : "launchAnalyzeAlert",
        "click a.duplicate": "launchDuplicateChorusView"
    },

    subviews: {
        '.tab_control': 'tabs'
    },

    setup: function() {
        this.checkedDatasetsLength = 0;
        chorus.PageEvents.subscribe("dataset:selected", this.setDataset, this);
        chorus.PageEvents.subscribe("dataset:checked", this.datasetChecked, this);
        chorus.PageEvents.subscribe("column:selected", this.setColumn, this);
        chorus.PageEvents.subscribe("importSchedule:changed", this.updateImportSchedule, this);
        chorus.PageEvents.subscribe("workspace:associated", this.refetchModel, this);
        chorus.PageEvents.subscribe("analyze:running", this.resetStatistics, this)
        chorus.PageEvents.subscribe("start:visualization", this.enterVisualizationMode, this)
        chorus.PageEvents.subscribe("cancel:visualization", this.endVisualizationMode, this)
        this.tabs = new chorus.views.TabControl(['activity', 'statistics']);
    },

    render: function() {
        if (!this.disabled) {
            this._super("render", arguments);
        }
    },

    refetchModel: function() {
        this.resource && this.resource.fetch();
    },

    setColumn: function(column) {
        if (column) {
            this.selectedColumn = column;
            this.tabs.statistics.column = column;
        } else {
            delete this.selectedColumn;
            delete this.tabs.statistics.column;
        }

        this.render();
    },

    setDataset: function(dataset) {
        this.resource = dataset;
        this.tabs.statistics && this.tabs.statistics.teardown();
        this.tabs.activity && this.tabs.activity.teardown();
        if (dataset) {

            var activities = dataset.activities();
            activities.fetch();

            this.tabs.activity = new chorus.views.ActivityList({
                collection: activities,
                additionalClass: "sidebar",
                displayStyle: ['without_workspace'],
                type: t("database_object." + dataset.get('objectType'))
            });

            this.tabs.statistics = new chorus.views.DatasetStatistics({
                model: dataset,
                column: this.selectedColumn
            });

            var statistics = dataset.statistics();
            statistics.fetchIfNotLoaded();
            this.bindings.add(statistics, "loaded", this.render);

            if (dataset.canBeImportSourceOrDestination()) {
                this.importConfiguration = dataset.getImport();
                this.bindings.add(this.importConfiguration, "loaded", this.render);
                this.importConfiguration.fetch();
            }
        } else {
            delete this.tabs.statistics;
            delete this.tabs.activity;
            delete this.importConfiguration;
        }

        this.render();
    },

    datasetChecked: function(checkedDatasets) {
        this.checkedDatasets = checkedDatasets;
        this.showOrHideMultipleSelectionSection();
    },

    showOrHideMultipleSelectionSection: function() {
        var multiSelectEl = this.$(".multiple_selection");
        var numChecked = this.checkedDatasets ? this.checkedDatasets.length : 0;
        multiSelectEl.toggleClass("hidden", numChecked <= 1);
        multiSelectEl.find(".count").text(t("dataset.sidebar.multiple_selection.count", { count: numChecked }))
    },

    resetStatistics: function(){
        this.resource.statistics().fetch();
    },

    additionalContext: function() {
        return new chorus.presenters.DatasetSidebar(this.resource, this.options);
    },

    postRender: function() {
        var $actionLinks = this.$("a.create_schedule, a.edit_schedule, a.import_now, a.download, a.delete");
        $actionLinks.data("dataset", this.resource);
        $actionLinks.data("workspace", this.resource && this.resource.workspace());
        this.showOrHideMultipleSelectionSection();
        this._super("postRender");
    },

    launchAddCredentialsDialog: function(e) {
        e && e.preventDefault();
        new chorus.dialogs.InstanceAccount({ instance: this.resource.instance(), title: t("instances.sidebar.add_credentials"), reload: true, goBack: false }).launchModal();
    },

    launchAssociateWithWorkspaceDialog: function(e) {
        e.preventDefault();

        new chorus.dialogs.AssociateWithWorkspace({model: this.resource, activeOnly: true}).launchModal();
    },

    launchAssociateMultipleWithWorkspaceDialog: function(e) {
        e.preventDefault();

        new chorus.dialogs.AssociateMultipleWithWorkspace({datasets: this.checkedDatasets, activeOnly: true}).launchModal();
    },

    launchDatasetPreviewDialog: function(e) {
        e.preventDefault();

        new chorus.dialogs.DatasetPreview({model: this.resource}).launchModal();
    },

    launchAnalyzeAlert: function(e) {
        e && e.preventDefault();
        new chorus.alerts.Analyze({model: this.resource}).launchModal();
    },

    launchDuplicateChorusView: function(e) {
        e.preventDefault();
        var dialog = new chorus.dialogs.VerifyChorusView({ model : this.resource.createDuplicateChorusView() });
        dialog.launchModal();
    },

    updateImportSchedule: function(importConfiguration) {
        if(!this.resource)
            return;

        this.resource._datasetImport = importConfiguration;
        this.render();
    },

    enterVisualizationMode: function() {
        $(this.el).addClass("visualizing");
    },

    endVisualizationMode: function() {
        $(this.el).removeClass("visualizing");
    }
});
