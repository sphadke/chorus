chorus.dialogs.ImportScheduler = chorus.dialogs.Base.extend({
    className: "import_scheduler",
    useLoadingSection: true,
    persistent: true,

    subviews: {
        ".schedule": "scheduleView"
    },

    events: {
        "change input:radio": "onDestinationChosen",
        "change input:checkbox": "onCheckboxClicked",
        "keyup input:text": "onInputFieldChanged",
        "paste input:text": "onInputFieldChanged",
        "click button.submit": "beginImport"
    },

    makeModel: function() {
        this.dataset = this.options.launchElement.data("dataset");
        var workspaceId = this.dataset.get("workspace").id;

        if (this.options.launchElement.data("import")) {
            this.model = this.options.launchElement.data("import");
        } else {
            this.model = new chorus.models.DatasetImport({datasetId: this.dataset.id, workspaceId: workspaceId});
        }

        this.sandboxTables = new chorus.collections.DatasetSet([], {workspaceId: workspaceId, type: "SANDBOX_TABLE"});
        this.requiredResources.push(this.sandboxTables);
        this.sandboxTables.sortAsc("objectName");
        this.sandboxTables.fetchAll();

        this.bindings.add(this.model, "saved", this.importSaved);
        this.bindings.add(this.model, "saveFailed", function() {
            this.$("button.submit").stopLoading();
        });
    },

    setup: function() {
        this.scheduleView = new chorus.views.ImportSchedule({ enable: false });
        var launchElement = this.options.launchElement;

        if (launchElement.hasClass("create_schedule")) {
            this.title = t("import.title_schedule");
            this.submitText = t("import.begin_schedule")
            this.showSchedule = true;
        } else if (launchElement.hasClass("edit_schedule")) {
            this.title = t("import.title_edit_schedule");
            this.submitText = t("actions.save_changes");
            this.showSchedule = true;
        } else {
            this.title = t("import.title");
            this.submitText = t("import.begin");
        }
    },

    postRender: function() {
        this.setFieldValues(this.model);
        _.defer(_.bind(function() {chorus.styleSelect(this.$("select.names"))}, this));
    },

    setFieldValues: function(model) {
        this.$("input[type='radio']").attr("checked", false);
        if (model.get("toTable")) {
            this.$("input[type='radio']#import_scheduler_existing_table").attr("checked", "checked").change();
        } else {
            this.$("input[type='radio']#import_scheduler_new_table").attr("checked", "checked").change();
        }

        if (this.model.get("scheduleInfo")) {
            this.$("input[name='schedule']").attr("checked", "checked");
            this.scheduleView.setFieldValues(this.model);
        }

        if (model.get("truncate")) {
            this.$(".truncate").attr("checked", "checked");
        } else {
            this.$(".truncate").attr("checked", false);
        }

        this.$("select[name='toTable']").val(model.get("toTable"));
        if (model.get("sampleCount")) {
            this.$("input[name='limit_num_rows']").attr("checked", "checked");
            this.$("input[name='sampleCount']").val(model.get("sampleCount"));
        }
    },

    resourcesLoaded: function() {
        this.sandboxTables.models = _.filter(this.sandboxTables.models, _.bind(function(table) {
            return _.include(["BASE_TABLE", "MASTER_TABLE"], table.get("objectType"));
        }, this));
    },

    onDestinationChosen: function() {
        var disableExisting = this.$(".new_table input:radio").prop("checked");

        var $tableName = this.$(".new_table input.name");
        $tableName.prop("disabled", !disableExisting);
        $tableName.closest("fieldset").toggleClass("disabled", !disableExisting);

        var $tableSelect = this.$(".existing_table select");
        $tableSelect.prop("disabled", disableExisting);
        $tableSelect.closest("fieldset").toggleClass("disabled", disableExisting);

        chorus.styleSelect(this.$("select.names"));
        this.onInputFieldChanged();
    },

    additionalContext: function() {
        return {
            sandboxTables: this.sandboxTables.pluck("objectName"),
            canonicalName: this.dataset.schema().canonicalName(),
            showSchedule: this.showSchedule,
            submitText: this.submitText
        }
    },

    onInputFieldChanged: function() {
        this.model.performValidation(this.getNewModelAttrs());
        this.$("button.submit").prop("disabled", !this.model.isValid());
    },

    onCheckboxClicked: function(e) {
        var $fieldSet = this.$("fieldset").not(".disabled");
        var enabled = $fieldSet.find("input[name=limit_num_rows]").prop("checked");
        var $limitInput = $fieldSet.find(".limit input:text");
        $limitInput.prop("disabled", !enabled);

        if ($(e.target).is("input[name='schedule']")) {
            $(e.target).prop("checked") ? this.scheduleView.enable() : this.scheduleView.disable();
        }

        this.onInputFieldChanged();
    },

    beginImport: function() {
        if (this.model.has("scheduleInfo")) {
            this.$("button.submit").startLoading("import.saving");
        } else {
            this.$("button.submit").startLoading("import.importing");
        }
        this.model.save(this.getNewModelAttrs());
    },

    importSaved: function() {
        if (this.model.has("scheduleInfo")) {
            chorus.toast("import.schedule.toast");
        } else {
            chorus.toast("import.success");
        }
        this.closeModal();
    },

    getNewModelAttrs: function() {
        var updates = {};
        var $enabledFieldSet = this.$("fieldset").not(".disabled");
        _.each($enabledFieldSet.find("input:text, input[type=hidden], select"), function(i) {
            var input = $(i);
            if (input.closest(".schedule_widget").length == 0) {
                updates[input.attr("name")] = input.val() && input.val().trim();
            }
        });

        var $truncateCheckbox = $enabledFieldSet.find(".truncate");
        if ($truncateCheckbox.length) {
            updates.truncate = $truncateCheckbox.prop("checked") + "";
        }

        updates.useLimitRows = $enabledFieldSet.find(".limit input:checkbox").prop("checked");
        if (updates.useLimitRows) {
            updates.sampleCount = $enabledFieldSet.find("input[name='sampleCount']").val();
        }

        if ($enabledFieldSet.find("input:checkbox[name='schedule']").prop("checked")) {
            _.extend(updates, this.scheduleView.fieldValues());
            updates.importType = "schedule"
            updates.scheduleDays = "1:2";
        } else {
            updates.importType = "oneTime"
        }

        return updates;
    }
});
