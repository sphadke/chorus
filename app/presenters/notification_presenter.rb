class NotificationPresenter < Presenter
  def to_hash
    presenter_event = EventPresenter.new(model.event, @view_context, :activity_stream => true)
    {
        :id => model.id,
        :recipient => present(model.recipient, @options),
        :event => presenter_event.simple_hash,
        :comment => present(model.comment),
        :unread => !(model.read),
        :timestamp => model.created_at
    }
  end

  def complete_json?
    true
  end
end