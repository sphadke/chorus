chorus.views.HdfsEntrySidebar = chorus.views.Sidebar.extend({
    constructorName: "HdfsEntrySidebar",
    templateName: "hdfs_entry_sidebar",

    subviews: {
        '.tab_control': 'tabs'
    },

    events : {
        'click .external_table': 'createExternalTable',
        'click .directory_external_table': "openDirectoryExternalTable"
    },

    setup: function() {
        chorus.PageEvents.subscribe("hdfs_entry:selected", this.setEntry, this);
        chorus.PageEvents.subscribe("csv_import:started", this.refreshActivities, this);
        this.tabs = new chorus.views.TabControl(["activity"]);
    },

    refreshActivities: function() {
        this.tabs.activity && this.tabs.activity.collection.fetch();
    },

    postRender: function() {
        this._super("postRender");
        if (this.resource && this.resource.get("isDir")) {
            this.$(".tab_control").addClass("hidden")
            this.$(".tabbed_area").addClass("hidden")
        } else {
            this.$(".tab_control").removeClass("hidden")
            this.$(".tabbed_area").removeClass("hidden")
        }
    },

    setEntry: function(entry) {
        this.resource = entry;
        if (entry) {
            entry.entityId = this.resource.id;

            if (this.tabs.activity ) {
                delete this.tabs.activity ;
            }

            if (!entry.get("isDir")) {
                var activities = entry.activities();
                activities.fetch();

                this.bindings.add(activities, "changed", this.render);
                this.bindings.add(activities, "reset", this.render);

                this.tabs.activity = new chorus.views.ActivityList({
                    collection: activities,
                    additionalClass: "sidebar",
                    type: t("hdfs." + (entry.get("isDir") ? "directory" : "file"))
                });
            }
        } else {
            delete this.tabs.activity;
        }

        this.render();
    },

    additionalContext: function() {
        return {
            entityId: this.resource && this.resource.id,
            lastUpdatedStamp: t("hdfs.last_updated", { when : chorus.helpers.relativeTimestamp(this.resource && this.resource.get("lastUpdatedStamp"))})
        }
    },

    createExternalTable: function(e) {
        e && e.preventDefault();
        var hadoopInstance = new chorus.models.HadoopInstance({id: this.options.hadoopInstanceId});

        var hdfsFile = new chorus.models.HdfsEntry({
            hadoopInstance: hadoopInstance,
            id: this.resource.id
        });

        hdfsFile.fetch();

        this.bindings.add(hdfsFile, "loaded", function() {
            var externalTable = new chorus.models.HdfsExternalTable({
                path: hdfsFile.get('path'),
                hadoopInstanceId: hadoopInstance.get('id'),
                hdfs_entry_id: hdfsFile.get('id')
            });

            var dialog = new chorus.dialogs.CreateExternalTableFromHdfs({
                model: externalTable,
                csvOptions: {
                    tableName: hdfsFile.name(),
                    contents: hdfsFile.get('contents')
                }
            });
            dialog.launchModal();
        });
    },

    openDirectoryExternalTable: function(e) {
        e.preventDefault();

        new chorus.dialogs.HdfsInstanceWorkspacePicker({model: this.resource, activeOnly: true}).launchModal();
    }

});
