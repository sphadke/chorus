require 'allowy'

class DefaultAccess
  include Allowy::AccessControl

  delegate :current_user, :to => :context

  def can?(*args)
    current_user.admin? || super(*args)
  end

  def access_for(model)
    context.current_allowy.access_control_for(model) || DefaultAccess.new(context)
  end

  def create_note_on?(model)
    true
  end
end
