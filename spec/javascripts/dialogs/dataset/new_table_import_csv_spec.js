describe("chorus.dialogs.NewTableImportCSV", function() {
    function submitChangedColumnName(dialog, newName) {
        dialog.$(".field_name input").eq(0).val(newName).change();
        dialog.$("button.submit").click();
    }

    beforeEach(function() {
        chorus.page = {};
        chorus.page.workspace = rspecFixtures.workspace({
            sandboxInfo: {
                name: "mySchema",
                database: { name: "myDatabase", instance: { name: "myInstance" } }
            }
        });
        this.sandbox = chorus.page.workspace.sandbox();
        this.csvOptions = {
            tableName: 'foo_quux_bar',
            hasHeader: true,
            contents: [
                "COL1,col2, \"col3 ,col 4,Col_5",
                "val1.1,val1.2,val1.3,val1.4,val1.5",
                "val2.1,val2.2,val2.3,val2.4,val2.5",
                "val3.1,val3.2,val3.3,val3.4,val3.5"
            ]
        };

        this.model = new (chorus.models.Base.extend({
            constructorName: 'FakeModel',
            urlTemplate: "workspaces/123/external_tables"
        }))();

        this.dialog = new chorus.dialogs.NewTableImportCSV({ model: this.model, csvOptions: this.csvOptions });
        this.dialog.render();
    });

    it("has the title", function() {
        expect(this.dialog.$('h1')).toContainTranslation("dataset.import.table.title");
    });

    it("has an import button", function() {
        expect(this.dialog.$('button.submit')).toContainTranslation("dataset.import.table.submit");
    });

    it("has comma as the default separator", function() {
        expect(this.dialog.$('input[name=delimiter]:checked').val()).toBe(',');
    });

    it("shows an error when the CSV doesn't parse correctly", function() {
        this.dialog.$("input.delimiter[value=' ']").click();
        expect(this.dialog.$(".errors")).not.toBeEmpty();
    });

    describe("click the 'tab' separator", hasRightSeparator('\t'));
    describe("click the 'comma' separator", hasRightSeparator(','));
    describe("click the 'semicolon' separator", hasRightSeparator(';'));
    describe("click the 'space' separator", hasRightSeparator(' '));

    describe("changing the separator", function() {
        beforeEach(function() {
            expect(this.dialog.model.get("types").length).toBe(5);
            this.dialog.$("input.delimiter[value=';']").click();
        });

        it("recalculates the column types", function() {
            expect(this.dialog.model.get("types").length).toBe(1);
        });
    });

    function hasRightSeparator(separator) {
        return function() {
            beforeEach(function() {
                this.csvOptions = { contents: [
                    "COL1" + separator + "col2" + separator + "col3" + separator + "col_4" + separator + "Col_5",
                    "val1.1" + separator + "val1.2" + separator + "val1.3" + separator + "val1.4" + separator + "val1.5",
                    "val2.1" + separator + "val2.2" + separator + "val2.3" + separator + "val2.4" + separator + "val2.5",
                    "val3.1" + separator + "val3.2" + separator + "val3.3" + separator + "val3.4" + separator + "val3.5"
                ],
                    tableName: 'foo_quux_bar'
                };

                this.dialog = new chorus.dialogs.NewTableImportCSV({ model: this.model, csvOptions: this.csvOptions });
                this.dialog.render();

                this.dialog.$("input.delimiter[value='" + separator + "']").click();
            });

            it("has " + separator + " as separator", function() {
                expect(this.dialog.$('input.delimiter:checked').val()).toBe(separator);
            });

            it("reparses the file with " + separator + " as the separator", function() {
                expect(this.dialog.$(".data_table .tbody .column").length).toEqual(5);
            });
        };
    }

    describe("other delimiter input field", function() {
        beforeEach(function() {
            this.otherField = this.dialog.$('input[name=custom_delimiter]');
        });

        it("is empty on loading", function() {
            expect(this.otherField.val()).toBe("");
        });

        it("checks the Other radio button", function() {
            this.otherField.val("X");
            this.otherField.trigger("keyup");
            expect(this.dialog.$('input.delimiter[type=radio]:checked').val()).toBe("other");
        });

        it("retains its value after re-render", function() {
            this.otherField.val("X");
            this.otherField.trigger("keyup");
            expect(this.otherField).toHaveValue("X");
        });

        describe("clicking on radio button Other", function() {
            beforeEach(function() {
                spyOn($.fn, 'focus');
                this.dialog.$("input#delimiter_other").click();
            });

            it("focuses the text field", function() {
                expect($.fn.focus).toHaveBeenCalled();
                expect($.fn.focus.mostRecentCall.object).toBe("input:text");
            });

            describe("entering 'z' as a separator", function() {
                beforeEach(function() {
                    this.csvOptions = {contents: [
                        "COL1zcol2zcol3zcol_4zCol_5",
                        "val1.1zval1.2zval1.3zval1.4zval1.5",
                        "val2.1zval2.2zval2.3zval2.4zval2.5",
                        "val3.1zval3.2zval3.3zval3.4zval3.5"
                    ],
                        tableName: 'foo_quux_bar'
                    };

                    this.dialog = new chorus.dialogs.NewTableImportCSV({ model: this.model, csvOptions: this.csvOptions });
                    this.dialog.render();

                    this.dialog.$("input#delimiter_other").click();
                    this.dialog.$('input[name=custom_delimiter]').val("z");
                    this.dialog.$('input[name=custom_delimiter]').trigger('keyup')
                });

                it("has z as separator", function() {
                    expect(this.dialog.$('input.delimiter:checked').val()).toBe('other');
                });

                it("reparses the file with z as the separator", function() {
                    expect(this.dialog.$(".data_table .tbody .column").length).toEqual(5);
                });
            });
        })
    });

    it("has directions", function() {
        var sandbox = chorus.page.workspace.sandbox();
        expect(this.dialog.$('.directions')).toContainTranslation("dataset.import.table.new.directions", {
            tablename_input_field: ''
        });

        expect(this.dialog.$(".directions input:text").val()).toBe("foo_quux_bar");
    });

    context("when the 'includeHeader' property is not overridden", function() {
        it("has the include header row checkbox checked by default", function() {
            expect(this.dialog.$("#hasHeader")).toBeChecked();
        });
    });

    context("when the 'includeHeader' property is false", function() {
        it("has the header row checkbox unchecked and hidden", function() {
            var Subclass = chorus.dialogs.NewTableImportCSV.extend({ includeHeader: false });
            this.dialog = new Subclass({ model: this.model, csvOptions: this.csvOptions });
            this.dialog.render();

            var checkbox = this.dialog.$("#hasHeader")
            expect(checkbox).not.toExist();
        });
    });

    describe("the data table", function() {
        it("has the right number of column names", function() {
            expect(this.dialog.$(".data_table .thead .column_names .th input:text").length).toEqual(5);
        })

        it("converts the column names into db friendly format", function() {
            var $inputs = this.dialog.$(".data_table .thead .column_names .th input:text");
            expect($inputs.eq(0).val()).toBe("col1")
            expect($inputs.eq(1).val()).toBe("col2")
            expect($inputs.eq(2).val()).toBe("col3")
            expect($inputs.eq(3).val()).toBe("col_4")
            expect($inputs.eq(4).val()).toBe("col_5")
        })

        it("has the right number of column data types", function() {
            expect(this.dialog.$(".data_table .thead .data_types .th").length).toEqual(5);
        })

        it("does not memoize the data types", function() {
            this.oldLinkMenus = this.dialog.linkMenus
            this.dialog.render();
            expect(this.oldLinkMenus === this.dialog.linkMenus).toBeFalsy();
        })

        it("has the right number of data columns", function() {
            expect(this.dialog.$(".data_table .tbody .column").length).toEqual(5);
        })

        it("displays the provided types", function() {
            var csvParser = new chorus.utilities.CsvParser(this.csvOptions.contents, this.csvOptions);
            var columnData = csvParser.getColumnOrientedData();

            _.each(this.dialog.$(".th .type"), function(th, index) {
                expect($(th).find(".chosen").text().trim()).toBe(columnData[index].type);
            }, this);
        });

        it("has the right data in each cell", function() {
            _.each(this.dialog.$(".data_table .tbody .column"), function(column, i) {
                var cells = $(column).find(".td")
                expect(cells.length).toEqual(3);
                _.each(cells, function(cell, j) {
                    expect($(cell)).toContainText("val" + (j + 1) + "." + (i + 1));
                })
            });
        });

        describe("selecting a new data type", function() {
            beforeEach(function() {
                this.$type = this.dialog.$(".th .type").eq(1)
                this.$type.find(".chosen").click();

                this.$type.find(".popup_filter li").eq(1).find("a").click();
            })

            it("changes the type of the column", function() {
                expect(this.$type.find(".chosen")).toHaveText("float");
                expect(this.$type).toHaveClass("float");
            })
        })
    });

    describe("unchecking the include header box", function() {
        beforeEach(function() {
            spyOn(this.dialog, "postRender").andCallThrough();
            spyOn(this.dialog, "recalculateScrolling").andCallThrough();
            this.dialog.$("#hasHeader").prop("checked", false);
            this.dialog.$("#hasHeader").change();
        })

        it("sets header on the csv model", function() {
            expect(this.dialog.model.get("hasHeader")).toBeFalsy();
        });

        it("re-renders", function() {
            expect(this.dialog.postRender).toHaveBeenCalled();
        });

        it("the box is unchecked", function() {
            expect(this.dialog.$("#hasHeader").prop("checked")).toBeFalsy();
        });

        it("calls recalculate Scrolling", function() {
            expect(this.dialog.recalculateScrolling).toHaveBeenCalled();
        });

        describe("rechecking the box", function() {
            beforeEach(function() {
                this.dialog.postRender.reset();
                this.dialog.$("#hasHeader").prop("checked", true).change();
            });

            it("sets header on the csv model", function() {
                expect(this.dialog.model.get("hasHeader")).toBeTruthy();
            });

            it("re-renders", function() {
                expect(this.dialog.postRender).toHaveBeenCalled();
            });

            it("the box is checked", function() {
                expect(this.dialog.$("#hasHeader").prop("checked")).toBeTruthy();
            });

            it("retains column names header-generated-header", function() {
                this.dialog.$(".field_name input").eq(0).val("gobbledigook").change();

                this.dialog.$("#hasHeader").prop("checked", false).change();
                this.dialog.$("#hasHeader").prop("checked", true).change();
                expect(this.dialog.$(".field_name input").eq(0).val()).toBe("gobbledigook");
            });

            it("retains column names header-generated-header", function() {
                this.dialog.$("#hasHeader").prop("checked", false).change();
                this.dialog.$(".field_name input").eq(0).val("gobbledigook").change();

                this.dialog.$("#hasHeader").prop("checked", true).change();
                expect(this.dialog.$(".field_name input").eq(0).val()).toBe("col1");
                this.dialog.$("#hasHeader").prop("checked", false).change();
                expect(this.dialog.$(".field_name input").eq(0).val()).toBe("gobbledigook");
            });

            it("retains the table name", function() {
                this.dialog.$("input[name=tableName]").val("testisgreat").change();
                this.dialog.$("#hasHeader").prop("checked", false).change();
                expect(this.dialog.$(".field_name input").eq(0).val()).toBe("column_1");
                this.dialog.$("#hasHeader").prop("checked", true).change();
                expect(this.dialog.$("input[name=tableName]").val()).toBe("testisgreat");
            });
        })
    });

    describe("scrolling the data", function() {
        beforeEach(function() {
            spyOn(this.dialog, "adjustHeaderPosition").andCallThrough();
            this.dialog.render();
            this.dialog.$(".tbody").trigger("scroll");
        });
        it("sets the header position", function() {
            expect(this.dialog.adjustHeaderPosition).toHaveBeenCalled();
        });
    })

    describe("with invalid column names", function() {
        beforeEach(function() {
            this.$input = this.dialog.$(".column_names input:text").eq(0);
            this.$input.val('');

            this.$input2 = this.dialog.$(".column_names input:text").eq(1);
            this.$input2.val('a ');

            this.dialog.$("button.submit").click();
        });

        it("does not put the button in the loading state", function() {
            expect(this.dialog.$("button.submit").isLoading()).toBeFalsy();
        })

        it("marks that inputs invalid", function() {
            expect(this.$input).toHaveClass("has_error");
            expect(this.$input2).toHaveClass("has_error");
        });

        describe("performValidation", function() {
            it ("does not validate", function() {
                expect(this.dialog.performValidation()).toBe(false);
            });
        });

        describe("correcting part of the invalid data", function() {
            beforeEach(function() {
                this.$input2.val('a');
                this.dialog.$("button.submit").click();
            });

            it("removes the error warning from the corrected element", function() {
                expect(this.$input).toHaveClass("has_error");
                expect(this.$input2).not.toHaveClass("has_error");
            });
        });
    });

    describe("with invalid table name", function() {
        beforeEach(function() {
            this.$tableNameInput = this.dialog.$(".directions input:text");
            this.$tableNameInput.attr('value', '');

            this.dialog.$("button.submit").click();
        });

        it("marks that inputs invalid", function() {
            expect(this.$tableNameInput).toHaveClass("has_error");
        });

        describe("performValidation", function() {
            it ("does not validate", function() {
                expect(this.dialog.performValidation()).toBe(false);
            });
        });
    });

    describe("clicking the import button", function() {
        beforeEach(function() {
            spyOn(this.dialog, "closeModal");
        });

        it("starts the spinner", function() {
            this.dialog.$("button.submit").click();

            expect(this.dialog.$("button.submit").isLoading()).toBeTruthy();
            expect(this.dialog.$("button.submit").text().trim()).toMatchTranslation("dataset.import.importing");
        });

        context("when user overrides the header names", function() {
            it("writes the overridden header names to the model", function() {
                this.dialog.$('#hasHeader').prop('checked', true).change();
                submitChangedColumnName(this.dialog, "gobbledigook");

                var params = this.server.lastCreate().params();
                expect(params["fake_model[column_names][]"]).toEqual(['gobbledigook', 'col2', 'col3', 'col_4', 'col_5']);
            });
        });

        context("when user overrides the generated names", function() {
            it("writes the overridden generated names to the model", function() {
                this.dialog.$('#hasHeader').prop('checked', false).change();
                submitChangedColumnName(this.dialog, "gobbledigook");

                var params = this.server.lastCreate().params();
                expect(params["fake_model[column_names][]"]).toEqual(['gobbledigook', 'column_2', 'column_3', 'column_4', 'column_5']);
            });
        });

        it("imports the file", function() {
            this.dialog.$("button.submit").click();

            expect(this.server.lastCreate().url).toBe(this.dialog.model.url());
            var params = this.server.lastCreate().params();

            expect(params["fake_model[types][]"].length).toBe(5);
            expect(params["fake_model[table_name]"]).toBe("foo_quux_bar");
            expect(params["fake_model[delimiter]"]).toBe(",");

            expect(params["fake_model[column_names][]"]).toEqual(['col1', 'col2', 'col3', 'col_4', 'col_5']);
        });

        context("when the post to import responds with success", function() {
            beforeEach(function() {
                this.dialog.$("button.submit").click();
                spyOn(chorus, 'toast');
                spyOn(chorus.PageEvents, 'broadcast');
                this.server.lastCreateFor(this.dialog.model).succeed();
            });

            it("closes the dialog and displays a toast", function() {
                expect(this.dialog.closeModal).toHaveBeenCalled();
                expect(chorus.toast).toHaveBeenCalledWith("dataset.import.started");
            });

            it("triggers csv_import:started", function() {
                expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("csv_import:started");
            });
        })

        context("when the import fails", function() {
            beforeEach(function() {
                this.dialog.$("button.submit").click();
                this.server.lastCreateFor(this.dialog.model).failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
            });

            it("displays the error", function() {
                expect(this.dialog.$(".errors")).toContainText("A can't be blank");
            });
            it("re-enables the submit button", function() {
                expect(this.dialog.$("button.submit").isLoading()).toBeFalsy();
            })
            it("retains column names", function() {
                this.dialog.$(".field_name input").eq(0).val("gobbledigook").change();
                this.dialog.$("button.submit").click();
                this.server.lastCreate().failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
                expect(this.dialog.$(".field_name input").eq(0).val()).toBe("gobbledigook");
            })
            it("retains the table name", function() {
                this.dialog.$("input[name=tableName]").val("testisgreat").change();
                this.dialog.$("button.submit").click();
                this.server.lastCreate().failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
                expect(this.dialog.$("input[name=tableName]").val()).toBe("testisgreat");
            });

            context("when the table name is already taken", function () {
                beforeEach(function () {
                    this.dialog.$("input[name=tableName]").val("testisgreat").change();
                    this.dialog.$("button.submit").click();
                    this.server.lastCreate().failUnprocessableEntity({ fields:{ base:{ TABLE_EXISTS:{ table_name: "testisgreat", suggested_table_name: "testisgreat_1" }}}});
                });

                it("saves new name in the model attributes", function() {
                    this.dialog.$("input[name=tableName]").val("the_wizard_of_oz").change();
                    this.dialog.$("button.submit").click();
                    expect(this.dialog.model.get("toTable")).toBe("the_wizard_of_oz");
                    expect(this.dialog.model.get("tableName")).toBe("the_wizard_of_oz");
                });
            });
        })
    })
})
;
