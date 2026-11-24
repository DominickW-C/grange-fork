defmodule Grange.Repo.Migrations.AddGreenhouseToFarms do
  @moduledoc false

  use Ecto.Migration

  def change do
    alter table(:farms) do
      add(:greenhouse, :map, null: false, default: %{})
    end
  end
end
