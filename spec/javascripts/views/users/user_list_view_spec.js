describe("chorus.views.UserList", function() {
    it("is a selectable list", function() {
        expect(new chorus.views.UserList({collection: rspecFixtures.userSet()})).toBeA(chorus.views.SelectableList);
    });

    describe("#render", function() {
        describe("when the collection has loaded", function() {
            beforeEach(function() {
                this.collection = rspecFixtures.userSet([
                    {id: 10000, firstName: "a", lastName: "a", admin: false},
                    {id: 10001, firstName: "a", lastName: "b", admin: true},
                    {id: 10002, firstName: "a", lastName: "b", admin: false}
                ]);
                this.collection.loaded = true;
                this.view = new chorus.views.UserList({collection: this.collection});
                this.view.render();
            });

            it("should not have a loading element", function() {
                expect(this.view.$(".loading")).not.toExist();
            });

            it("displays the list of users", function() {
                expect(this.view.$("> li").length).toBe(3);
            });

            it("displays the users' names", function() {
                _.each(this.view.$("a.name span"), function(el) {
                    expect($(el).text().trim()).not.toBeEmpty();
                })
            })

            it("displays the users' title", function() {
                expect(this.view.$("a[title=title] .title")).not.toBeEmpty();
            })

            it("sets title attributes", function() {
                var self = this;

                _.each(this.view.$("a.name span"), function(el, index) {
                    var model = self.collection.at(index);
                    expect($(el).attr("title")).toBe([model.get("firstName"), model.get("lastName")].join(' '));
                })
            })

            it("displays the Administrator tag for admin users", function() {
                expect(this.view.$("li[data-userId=10001] .administrator")).toExist();
            });

            it("does not display the Administrator tag for non-admin users", function() {
                expect(this.view.$("li[data-userId=10000]")).toExist();
                expect(this.view.$("li[data-userId=10000] .administrator")).not.toExist();
            });

            it("displays an image for each user", function() {
                expect(this.view.$("li img").length).toBe(3);
                expect(this.view.$("li img").attr("src")).toBe(this.collection.models[0].fetchImageUrl({size: "icon"}));
            });

            it("displays a name for each user", function() {
                expect(this.view.$("li:nth-child(1) .main > .name").text().trim()).toBe("a a");
                expect(this.view.$("li:nth-child(2) .main > .name").text().trim()).toBe("a b");
            });

            it("links the user's name to the user show page", function() {
                expect(this.view.$("li:nth-child(1) a").attr("href")).toBe(this.collection.models[0].showUrl());
                expect(this.view.$("li:nth-child(2) a").attr("href")).toBe(this.collection.models[1].showUrl());
            });

            it("links the user's image to the user show page", function() {
                expect(this.view.$("li:nth-child(1) a img")).toExist();
                expect(this.view.$("li:nth-child(2) a img")).toExist();
            });

            it("broadcasts user:selected when a user's entry is selected", function() {
                spyOn(chorus.PageEvents, 'broadcast').andCallThrough();
                var user = rspecFixtures.user();
                this.view.itemSelected(user);
                expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("user:selected", user);
            });
        });
    })
});
